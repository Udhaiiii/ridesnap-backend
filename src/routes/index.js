// src/routes/index.js
const express  = require("express");
const multer   = require("multer");
const { v4: uuidv4 } = require("uuid");
const db       = require("../db/database");
const { uploadToS3, getPresignedUploadUrl, getPresignedReadUrl, buildS3Key } = require("../utils/s3");
const { getImageMeta } = require("../utils/watermark"); // watermark upload removed
const { sendPhotoLink, sendReceiptWithPhoto, sendOrderConfirmation } = require("../utils/email");
const { printWristbands, generateWristbandZPL, previewZPL } = require("../utils/printer");

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files allowed"), false);
  },
});

// ══════════════════════════════════════════════════════════════════
//  WRISTBANDS  –  QR Validation System
// ══════════════════════════════════════════════════════════════════

// GET /api/wristbands/today-status
// Returns today's batch info + next available number
// Used by bulk-qr-printer to auto-set start number
router.get("/wristbands/today-status", (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];

    // Get all wristbands generated today
    const todayWBs = db.prepare(`
      SELECT * FROM wristbands WHERE batch_date = ? ORDER BY created_at ASC
    `).all(today);

    if (todayWBs.length === 0) {
      // No wristbands today — fresh start from 1
      return res.json({
        success:        true,
        today,
        total_today:    0,
        next_from:      1,
        last_number:    0,
        batches_today:  [],
        message:        "No wristbands generated today. Start from 1.",
      });
    }

    // Find the highest number used today across all prefixes
    let maxNum = 0;
    const batchGroups = {};

    todayWBs.forEach(wb => {
      // Extract number from e.g. WB-0042 → 42
      const parts = wb.id.split("-");
      const num   = parseInt(parts[parts.length - 1]);
      if (!isNaN(num) && num > maxNum) maxNum = num;

      // Group by batch_label
      if (!batchGroups[wb.batch_label]) {
        batchGroups[wb.batch_label] = { label: wb.batch_label, count: 0, from: wb.id, to: wb.id };
      }
      batchGroups[wb.batch_label].count++;
      batchGroups[wb.batch_label].to = wb.id;
    });

    res.json({
      success:       true,
      today,
      total_today:   todayWBs.length,
      next_from:     maxNum + 1,   // ← next batch MUST start here
      last_number:   maxNum,
      batches_today: Object.values(batchGroups),
      message:       `Today: ${todayWBs.length} wristbands printed. Next batch starts from ${maxNum + 1}.`,
    });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/wristbands/generate
// Body: { quantity: 10, prefix: "WB", label: "Afternoon Batch" }
// Rules:
//   1. No duplicates same day — blocked
//   2. Must continue from last number today (auto-calculated)
//   3. Next day — auto fresh start from 1
router.post("/wristbands/generate", (req, res) => {
  try {
    const { quantity, prefix = "WB", label } = req.body;

    if (!quantity || quantity < 1) {
      return res.status(400).json({ success: false, error: "quantity is required (min 1)" });
    }
    if (quantity > 2000) {
      return res.status(400).json({ success: false, error: "Max 2000 per batch" });
    }

    const today = new Date().toISOString().split("T")[0];

    // ── Rule 2: Find next available number for today ──────────────
    const todayWBs = db.prepare(`
      SELECT id FROM wristbands WHERE batch_date = ? ORDER BY created_at ASC
    `).all(today);

    let nextFrom = 1; // default fresh start
    if (todayWBs.length > 0) {
      // Find max number used today
      let maxNum = 0;
      todayWBs.forEach(wb => {
        const parts = wb.id.split("-");
        const num   = parseInt(parts[parts.length - 1]);
        if (!isNaN(num) && num > maxNum) maxNum = num;
      });
      nextFrom = maxNum + 1; // must continue from here
    }

    const from       = nextFrom;
    const to         = from + quantity - 1;
    const batchLabel = label || `Batch ${today} · #${String(from).padStart(4,"0")}–#${String(to).padStart(4,"0")}`;

    // Build IDs for this batch
    const ids = [];
    for (let i = from; i <= to; i++) {
      ids.push(`${prefix}-${String(i).padStart(4, "0")}`);
    }

    // ── Rule 1: Check duplicates ONLY for TODAY ───────────────────
    // Old wristbands from previous days are ignored — fresh start each day
    const existingToday = db.prepare(`
      SELECT id FROM wristbands
      WHERE id IN (${ids.map(() => "?").join(",")})
      AND batch_date = ?
    `).all(...ids, today);

    if (existingToday.length > 0) {
      return res.status(409).json({
        success: false,
        error:   `These wristbands already exist for today: ${existingToday.map(w => w.id).join(", ")}`,
        hint:    "Cannot generate duplicates for the same day.",
      });
    }

    // ── Delete any old records with same IDs from previous days ──
    // So we can reuse WB-0001..WB-0010 every day cleanly
    if (ids.length > 0) {
      db.prepare(`
        DELETE FROM wristbands
        WHERE id IN (${ids.map(() => "?").join(",")})
        AND batch_date != ?
      `).run(...ids, today);
    }

    // ── Insert all for today ──────────────────────────────────────
    const insert     = db.prepare(`
      INSERT INTO wristbands (id, status, batch_date, batch_label)
      VALUES (?, 'inactive', ?, ?)
    `);
    const insertMany = db.transaction((list) => {
      for (const id of list) insert.run(id, today, batchLabel);
    });

    insertMany(ids);

    console.log(`✅ Registered ${ids.length} wristbands: ${ids[0]} → ${ids[ids.length-1]}`);
    res.json({
      success:     true,
      message:     `${ids.length} wristbands registered (${ids[0]} → ${ids[ids.length-1]})`,
      from:        ids[0],
      to:          ids[ids.length - 1],
      from_number: from,
      to_number:   to,
      count:       ids.length,
      batch_label: batchLabel,
      next_from:   to + 1,
    });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/wristbands/validate/:id
// Returns valid/invalid for a wristband ID
// Rule 3: only valid if batch_date = TODAY
router.get("/wristbands/validate/:id", (req, res) => {
  try {
    const id    = req.params.id.toUpperCase().trim();
    const today = new Date().toISOString().split("T")[0];

    const wb = db.prepare("SELECT * FROM wristbands WHERE id = ?").get(id);

    if (!wb) {
      return res.json({
        success: true,
        valid:   false,
        reason:  `"${id}" is not registered. Only pre-printed wristbands accepted.`,
      });
    }

    // ── Rule 3: Expired if not today's batch ──────────────────────
    if (wb.batch_date !== today) {
      return res.json({
        success: true,
        valid:   false,
        expired: true,
        reason:  `Wristband "${id}" was from ${wb.batch_date} and has expired. Only today's wristbands are valid.`,
      });
    }

    res.json({
      success:     true,
      valid:       true,
      wristband:   wb,
      status:      wb.status,
      batch_label: wb.batch_label,
    });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/wristbands/list
// Lists all wristbands (for admin)
router.get("/wristbands/list", (req, res) => {
  try {
    const { date, status } = req.query;
    let query = "SELECT * FROM wristbands WHERE 1=1";
    const params = [];
    if (date)   { query += " AND batch_date = ?"; params.push(date); }
    if (status) { query += " AND status = ?";     params.push(status); }
    query += " ORDER BY id ASC";

    const wristbands = db.prepare(query).all(...params);
    const total    = wristbands.length;
    const inactive = wristbands.filter(w => w.status === "inactive").length;
    const active   = wristbands.filter(w => w.status === "active").length;
    const used     = wristbands.filter(w => w.status === "used").length;

    res.json({ success: true, wristbands, stats: { total, inactive, active, used } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/wristbands/batches
// Lists all batches with counts
router.get("/wristbands/batches", (req, res) => {
  try {
    const batches = db.prepare(`
      SELECT batch_label, batch_date,
             COUNT(*)  as count,
             MIN(id)   as first_id,
             MAX(id)   as last_id,
             SUM(CASE WHEN status='inactive' THEN 1 ELSE 0 END) as inactive,
             SUM(CASE WHEN status='active'   THEN 1 ELSE 0 END) as active,
             SUM(CASE WHEN status='used'     THEN 1 ELSE 0 END) as used
      FROM wristbands
      GROUP BY batch_label, batch_date
      ORDER BY batch_date DESC
    `).all();
    res.json({ success: true, batches });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════
//  VISITS  –  Guest check-in
// ══════════════════════════════════════════════════════════════════

router.post("/visits", (req, res) => {
  try {
    const { guest_name, phone, email } = req.body;
    const id = "VIS-" + Date.now().toString(36).toUpperCase() + "-" + Math.random().toString(36).slice(2,5).toUpperCase();

    db.prepare(`INSERT INTO visits (id, guest_name, phone, email) VALUES (?, ?, ?, ?)`)
      .run(id, guest_name || "Guest", phone || null, email || null);

    const visit = db.prepare("SELECT * FROM visits WHERE id = ?").get(id);
    res.json({ success: true, visit });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/visits/:id  →  Get visit + all photos grouped by ride
router.get("/visits/:id", (req, res) => {
  try {
    const id = req.params.id.toUpperCase().trim();

    // Check wristband validity first
    const wb = db.prepare("SELECT * FROM wristbands WHERE id = ?").get(id);
    if (!wb) {
      return res.status(403).json({
        success: false,
        valid:   false,
        error:   "Invalid wristband ID. Not registered in system.",
      });
    }

    // Get visit record (may not exist yet if no photos uploaded)
    let visit = db.prepare("SELECT * FROM visits WHERE id = ?").get(id);

    // If wristband was re-registered today (new batch_date) but old visit exists
    // from a previous day — clear the old guest details so staff enters fresh info
    const today = new Date().toISOString().split("T")[0];
    if (visit && wb.batch_date === today) {
      const visitDate = visit.entry_time ? visit.entry_time.split(" ")[0] : "";
      if (visitDate && visitDate !== today) {
        // Old visit from previous day — reset guest details
        db.prepare(`UPDATE visits SET guest_name = 'Guest', phone = NULL, email = NULL,
                    entry_time = datetime('now','localtime') WHERE id = ?`).run(id);
        visit = db.prepare("SELECT * FROM visits WHERE id = ?").get(id);
      }
    }

    // Get all photos for this wristband — only today's photos
    const photos = db.prepare(`
      SELECT * FROM photos WHERE visit_id = ? AND date(captured_at) = date('now','localtime')
      ORDER BY captured_at DESC
    `).all(id);

    res.json({ success: true, visit: visit || { id }, photos, wristband: wb });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get("/visits", (req, res) => {
  try {
    const visits = db.prepare(`
      SELECT v.*, COUNT(p.id) as photo_count
      FROM visits v
      LEFT JOIN photos p ON p.visit_id = v.id
      WHERE date(v.entry_time) = date('now','localtime')
      GROUP BY v.id ORDER BY v.entry_time DESC
    `).all();
    res.json({ success: true, visits });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════
//  PHOTOS  –  Upload & management
// ══════════════════════════════════════════════════════════════════

router.post("/photos/upload", upload.single("photo"), async (req, res) => {
  try {
    const { visit_id, ride_id, ride_name } = req.body;
    if (!req.file)  return res.status(400).json({ success: false, error: "No photo file" });
    if (!visit_id)  return res.status(400).json({ success: false, error: "visit_id required" });

    const wbId = visit_id.toUpperCase().trim();

    // ── WRISTBAND VALIDATION ──────────────────────────────────────
    const wb = db.prepare("SELECT * FROM wristbands WHERE id = ?").get(wbId);
    if (!wb) {
      return res.status(403).json({
        success: false,
        valid:   false,
        error:   `Invalid wristband: ${wbId}. Only pre-registered wristbands are accepted.`,
      });
    }

    const photoId    = "PH-" + Math.random().toString(36).slice(2,8).toUpperCase();
    const origBuffer = req.file.buffer;

    // S3 upload FIRST (outside transaction — async operation)
    const meta    = await getImageMeta(origBuffer);
    const origKey = buildS3Key(ride_id, wbId, photoId, "original");
    const origUrl = await uploadToS3(origBuffer, origKey, "image/jpeg");

    // DB writes — all in one transaction (atomic — all succeed or all fail)
    const savePhoto = db.transaction(() => {
      // 1. Create visit if first time WB is used
      db.prepare("INSERT OR IGNORE INTO visits (id, guest_name) VALUES (?, 'Guest')").run(wbId);

      // 2. Mark wristband active on first use
      if (wb.status === "inactive") {
        db.prepare("UPDATE wristbands SET status='active', activated_at=datetime('now','localtime') WHERE id=?").run(wbId);
      }

      // 3. Insert photo record
      db.prepare(`
        INSERT INTO photos (id, visit_id, ride_id, ride_name, s3_key, s3_url, watermark_url, file_size, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'uploaded')
      `).run(photoId, wbId, ride_id || "R00", ride_name || "Unknown", origKey, origUrl, null, meta.size);

      return db.prepare("SELECT * FROM photos WHERE id = ?").get(photoId);
    });

    const photo = savePhoto();
    console.log(`📸 Photo uploaded: ${photoId} → wristband ${wbId}`);
    res.json({ success: true, photo, message: `Photo linked to wristband ${wbId}` });

  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post("/photos/presign", async (req, res) => {
  try {
    const { visit_id, ride_id } = req.body;
    const photoId = "PH-" + Math.random().toString(36).slice(2,8).toUpperCase();
    const key     = buildS3Key(ride_id || "R00", visit_id, photoId, "original");
    const url     = await getPresignedUploadUrl(key);
    res.json({ success: true, uploadUrl: url, photoId, s3Key: key });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get("/photos/:id", (req, res) => {
  try {
    const photo = db.prepare("SELECT * FROM photos WHERE id = ?").get(req.params.id);
    if (!photo) return res.status(404).json({ success: false, error: "Photo not found" });
    res.json({ success: true, photo });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════
//  ORDERS  –  Guest buys photo
// ══════════════════════════════════════════════════════════════════

// Prices read from .env — change anytime without touching code
const PRICES = {
  digital: parseInt(process.env.PRICE_DIGITAL) || 150,
  print:   parseInt(process.env.PRICE_PRINT)   || 250,
  frame:   parseInt(process.env.PRICE_FRAME)   || 350,
  combo:   parseInt(process.env.PRICE_COMBO)   || 499,
};

router.post("/orders", async (req, res) => {
  try {
    const { visit_id, photo_id, order_type, email, payment_mode, payment_splits } = req.body;

    if (!PRICES[order_type]) return res.status(400).json({ success: false, error: "Invalid order_type" });

    const photo = db.prepare("SELECT * FROM photos WHERE id = ?").get(photo_id);
    if (!photo) return res.status(404).json({ success: false, error: "Photo not found" });

    const visit   = db.prepare("SELECT * FROM visits WHERE id = ?").get(visit_id);
    const price   = PRICES[order_type];
    const orderId = "ORD-" + Math.random().toString(36).slice(2,8).toUpperCase();

    // Determine payment status
    const paidAmount = payment_splits
      ? JSON.parse(payment_splits).reduce((s, p) => s + (p.amount || 0), 0)
      : price;
    const pStatus = paidAmount >= price ? "paid" : paidAmount > 0 ? "partial" : "pending";
    const pMode   = payment_mode || (payment_splits ? "split" : "cash");
    const pSplits = payment_splits || null;

    db.prepare(`INSERT INTO orders (id, visit_id, photo_id, order_type, price, payment_status, payment_mode, payment_splits) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(orderId, visit_id, photo_id, order_type, price, pStatus, pMode, pSplits);

    db.prepare("UPDATE photos SET status = 'sold' WHERE id = ?").run(photo_id);

    // Send receipt + photo link to guest email at time of purchase
    // Only use email from request body — NEVER use park email or visit.email fallback
    const guestEmail = email && email.includes('@') && !email.toLowerCase().includes('wonderla.com')
      ? email : null;

    if (guestEmail) {
      try {
        const isDigital = order_type === "digital" || order_type === "combo";
        const downloadUrl = isDigital ? await getPresignedReadUrl(photo.s3_key, 7 * 24 * 3600) : null;

        // Generate receipt number
        const rcpCount = db.prepare(`SELECT COUNT(*) as cnt FROM orders WHERE date(created_at)=date('now','localtime') AND id<=?`).get(orderId)?.cnt || 1;
        const receiptNo = `RCP-${new Date().getFullYear()}-${String(rcpCount).padStart(4,"0")}`;
        const dateStr   = new Date().toLocaleString("en-IN", { day:"2-digit", month:"short", year:"numeric", hour:"2-digit", minute:"2-digit", hour12:true });

        // Send combined receipt + photo link email
        await sendReceiptWithPhoto({
          to:          guestEmail,
          guestName:   visit?.guest_name || "Guest",
          photoUrl:    downloadUrl,
          orderId,
          rideName:    photo.ride_name,
          orderType:   order_type,
          price:       PRICES[order_type],
          paymentMode: req.body.payment_mode || "cash",
          wristbandId: visit_id,
          receiptNo,
          date:        dateStr,
        });

        db.prepare("UPDATE orders SET email_sent = 1 WHERE id = ?").run(orderId);
        console.log(`📧 Receipt + photo sent to ${guestEmail} for order ${orderId}`);
      } catch (emailErr) {
        console.warn("Auto-email failed (order still placed):", emailErr.message);
      }
    }

    if (order_type === "print" || order_type === "frame" || order_type === "combo") {
      const printId   = "PRN-" + Math.random().toString(36).slice(2,8).toUpperCase();
      const printSize = order_type === "frame" ? "A4" : "6x4";
      db.prepare(`INSERT INTO print_queue (id, order_id, photo_id, visit_id, guest_name, phone, print_size) VALUES (?, ?, ?, ?, ?, ?, ?)`)
        .run(printId, orderId, photo_id, visit_id, visit?.guest_name, visit?.phone, printSize);
      db.prepare("UPDATE orders SET print_queued = 1 WHERE id = ?").run(orderId);
    }

    // Mark wristband as used once an order is placed
    db.prepare("UPDATE wristbands SET status='used' WHERE id=? AND status='active'").run(visit_id);

    const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(orderId);
    res.json({ success: true, order, message: "Order placed successfully!" });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/orders/bulk  →  Place orders for MULTIPLE photos at once
// Body: { visit_id, photo_ids: ["PH-xxx","PH-yyy"], order_type, email }
router.post("/orders/bulk", async (req, res) => {
  try {
    const { visit_id, photo_ids, order_type, email, payment_mode, payment_splits } = req.body;

    if (!Array.isArray(photo_ids) || photo_ids.length === 0)
      return res.status(400).json({ success: false, error: "photo_ids array required" });
    if (!PRICES[order_type])
      return res.status(400).json({ success: false, error: "Invalid order_type" });

    const visit  = db.prepare("SELECT * FROM visits WHERE id = ?").get(visit_id);
    const price  = PRICES[order_type];
    const orders = [];

    for (const photo_id of photo_ids) {
      const photo = db.prepare("SELECT * FROM photos WHERE id = ?").get(photo_id);
      if (!photo) continue;

      const orderId = "ORD-" + Math.random().toString(36).slice(2,8).toUpperCase();
      const paidAmt = payment_splits
        ? JSON.parse(payment_splits).reduce((s,p)=>s+(p.amount||0),0)
        : price;
      const pStat  = paidAmt >= price ? "paid" : paidAmt > 0 ? "partial" : "pending";
      const pMode  = payment_mode || (payment_splits ? "split" : "cash");
      db.prepare(`INSERT INTO orders (id, visit_id, photo_id, order_type, price, payment_status, payment_mode, payment_splits) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(orderId, visit_id, photo_id, order_type, price, pStat, pMode, payment_splits||null);
      db.prepare("UPDATE photos SET status = 'sold' WHERE id = ?").run(photo_id);

      // Email for digital
      const guestEmailBulk = email && email.includes('@') && !email.toLowerCase().includes('wonderla.com') ? email : null;
      if (guestEmailBulk) {
        try {
          const isDigital = order_type === "digital" || order_type === "combo";
          const downloadUrl = isDigital ? await getPresignedReadUrl(photo.s3_key, 7 * 24 * 3600) : null;
          const rcpCount2 = db.prepare(`SELECT COUNT(*) as cnt FROM orders WHERE date(created_at)=date('now','localtime') AND id<=?`).get(orderId)?.cnt || 1;
          const receiptNo2 = `RCP-${new Date().getFullYear()}-${String(rcpCount2).padStart(4,"0")}`;
          await sendReceiptWithPhoto({
            to: guestEmailBulk, guestName: visit?.guest_name || "Guest",
            photoUrl: downloadUrl, orderId, rideName: photo.ride_name,
            orderType: order_type, price: price,
            paymentMode: payment_mode || "cash", wristbandId: visit_id,
            receiptNo: receiptNo2,
            date: new Date().toLocaleString("en-IN", { day:"2-digit", month:"short", year:"numeric", hour:"2-digit", minute:"2-digit", hour12:true }),
          });
          db.prepare("UPDATE orders SET email_sent = 1 WHERE id = ?").run(orderId);
        } catch(e) { console.warn("Auto-email failed:", e.message); }
      }

      // Print queue
      if (order_type === "print" || order_type === "frame" || order_type === "combo") {
        const printId   = "PRN-" + Math.random().toString(36).slice(2,8).toUpperCase();
        const printSize = order_type === "frame" ? "A4" : "6x4";
        db.prepare(`INSERT INTO print_queue (id, order_id, photo_id, visit_id, guest_name, phone, print_size) VALUES (?, ?, ?, ?, ?, ?, ?)`)
          .run(printId, orderId, photo_id, visit_id, visit?.guest_name, visit?.phone, printSize);
        db.prepare("UPDATE orders SET print_queued = 1 WHERE id = ?").run(orderId);
      }

      orders.push(db.prepare("SELECT * FROM orders WHERE id = ?").get(orderId));
    }

    db.prepare("UPDATE wristbands SET status='used' WHERE id=? AND status='active'").run(visit_id);

    const totalAmount = price * orders.length;
    res.json({
      success: true,
      orders,
      count:   orders.length,
      total:   totalAmount,
      message: `${orders.length} order(s) placed — ₹${totalAmount} total`
    });
  } catch(err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get("/orders/:id", (req, res) => {
  try {
    const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(req.params.id);
    if (!order) return res.status(404).json({ success: false, error: "Order not found" });
    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════
//  PRINT QUEUE
// ══════════════════════════════════════════════════════════════════

router.get("/print-queue", (req, res) => {
  try {
    const { status } = req.query; // optional filter: queued, printing, done, collected

    // Build query — default shows ALL today's orders
    let where = "WHERE date(pq.queued_at) = date('now','localtime')";
    const params = [];

    if (status && status !== "all") {
      // Support comma-separated: ?status=queued,printing
      const statuses = status.split(",").map(s => s.trim());
      where += ` AND pq.status IN (${statuses.map(() => "?").join(",")})`;
      params.push(...statuses);
    }

    const queue = db.prepare(`
      SELECT pq.*, p.s3_url, p.ride_name, o.order_type, o.price
      FROM print_queue pq
      JOIN photos p ON p.id = pq.photo_id
      JOIN orders o ON o.id = pq.order_id
      ${where}
      ORDER BY pq.queued_at ASC
    `).all(...params);

    // Also return counts per status for tab badges
    const counts = db.prepare(`
      SELECT status, COUNT(*) as count
      FROM print_queue
      WHERE date(queued_at) = date('now','localtime')
      GROUP BY status
    `).all();

    const badges = { queued: 0, printing: 0, done: 0, collected: 0, all: 0 };
    counts.forEach(c => {
      badges[c.status] = c.count;
      badges.all += c.count;
    });

    res.json({ success: true, queue, badges });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.patch("/print-queue/:id/status", (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ["printing","done","collected"];
    if (!allowed.includes(status)) return res.status(400).json({ success: false, error: `Status must be: ${allowed.join(", ")}` });

    const extra = status === "done"      ? ", printed_at = datetime('now','localtime')"
                : status === "collected" ? ", collected_at = datetime('now','localtime')" : "";

    db.prepare(`UPDATE print_queue SET status = ? ${extra} WHERE id = ?`).run(status, req.params.id);

    if (status === "done") {
      const pq = db.prepare("SELECT * FROM print_queue WHERE id = ?").get(req.params.id);
      if (pq) db.prepare("UPDATE orders SET delivery_status = 'printed' WHERE id = ?").run(pq.order_id);
    }

    res.json({ success: true, message: `Print status updated to: ${status}` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════
//  RIDES
// ══════════════════════════════════════════════════════════════════

// GET /api/rides
router.get("/rides", (req, res) => {
  const rides = db.prepare("SELECT * FROM rides ORDER BY id ASC").all();
  res.json({ success: true, rides });
});

// POST /api/rides  →  Add new ride
router.post("/rides", (req, res) => {
  try {
    const { id, name, emoji } = req.body;
    if (!id || !name) return res.status(400).json({ success: false, error: "id and name are required" });

    const rideId = id.trim().toUpperCase();
    const exists = db.prepare("SELECT id FROM rides WHERE id = ?").get(rideId);
    if (exists) return res.status(409).json({ success: false, error: `Ride ${rideId} already exists` });

    db.prepare("INSERT INTO rides (id, name, emoji) VALUES (?, ?, ?)").run(rideId, name.trim(), emoji || "🎢");
    const ride = db.prepare("SELECT * FROM rides WHERE id = ?").get(rideId);
    console.log(`🎢 Ride added: ${rideId} — ${name}`);
    res.json({ success: true, ride });
  } catch(err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/rides/:id  →  Edit ride name / emoji
router.patch("/rides/:id", (req, res) => {
  try {
    const rideId = req.params.id.trim().toUpperCase();
    const { name, emoji } = req.body;
    if (!name) return res.status(400).json({ success: false, error: "name is required" });

    const exists = db.prepare("SELECT id FROM rides WHERE id = ?").get(rideId);
    if (!exists) return res.status(404).json({ success: false, error: `Ride ${rideId} not found` });

    db.prepare("UPDATE rides SET name = ?, emoji = ? WHERE id = ?").run(name.trim(), emoji || "🎢", rideId);

    // Also update ride_name in photos table so existing photos reflect new name
    db.prepare("UPDATE photos SET ride_name = ? WHERE ride_id = ?").run(name.trim(), rideId);

    const ride = db.prepare("SELECT * FROM rides WHERE id = ?").get(rideId);
    console.log(`✏️ Ride updated: ${rideId} → ${name}`);
    res.json({ success: true, ride });
  } catch(err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/rides/:id  →  Remove ride
router.delete("/rides/:id", (req, res) => {
  try {
    const rideId = req.params.id.trim().toUpperCase();
    const exists = db.prepare("SELECT id FROM rides WHERE id = ?").get(rideId);
    if (!exists) return res.status(404).json({ success: false, error: `Ride ${rideId} not found` });

    db.prepare("DELETE FROM rides WHERE id = ?").run(rideId);
    console.log(`🗑 Ride deleted: ${rideId}`);
    res.json({ success: true, message: `Ride ${rideId} deleted` });
  } catch(err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════
//  STATS
// ══════════════════════════════════════════════════════════════════

router.get("/stats", (req, res) => {
  try {
    const today    = db.prepare(`SELECT count(*) as c FROM visits WHERE date(entry_time)=date('now','localtime')`).get().c;
    const photos   = db.prepare(`SELECT count(*) as c FROM photos WHERE date(captured_at)=date('now','localtime')`).get().c;
    const orders   = db.prepare(`SELECT count(*) as c, sum(price) as revenue FROM orders WHERE date(created_at)=date('now','localtime') AND payment_status='paid'`).get();
    const pending  = db.prepare(`SELECT count(*) as c FROM print_queue WHERE status IN ('queued','printing')`).get().c;
    const wbStats  = db.prepare(`SELECT COUNT(*) as total, SUM(CASE WHEN status='active' THEN 1 ELSE 0 END) as active, SUM(CASE WHEN status='inactive' THEN 1 ELSE 0 END) as inactive FROM wristbands WHERE batch_date=date('now','localtime')`).get();

    res.json({
      success: true,
      stats: {
        guests_today:   today,
        photos_today:   photos,
        orders_today:   orders.c,
        revenue_today:  orders.revenue || 0,
        pending_prints: pending,
        wristbands:     wbStats,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════
//  WRISTBAND PRINT ROUTES
// ══════════════════════════════════════════════════════════════════

// POST /api/print/wristbands
// Body: { ids: ["WB-0001","WB-0002"...] }
// Sends ZPL to USB Zebra printer
router.post("/print/wristbands", async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0)
      return res.status(400).json({ success: false, error: "ids array required" });
    if (ids.length > 500)
      return res.status(400).json({ success: false, error: "Max 500 per print job" });

    console.log(`🖨️ Printing ${ids.length} wristbands...`);
    const today   = new Date().toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" });
    const results = await printWristbands(ids, today);

    const passed = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    console.log(`✅ Print complete: ${passed} success, ${failed} failed`);
    res.json({
      success: failed === 0,
      printed: passed,
      failed,
      results,
      message: `${passed}/${ids.length} wristbands printed`,
    });
  } catch(err) {
    console.error("Print error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/print/preview/:id
// Returns ZPL string for a wristband (for debugging)
router.get("/print/preview/:id", (req, res) => {
  try {
    const id  = req.params.id.toUpperCase();
    const zpl = previewZPL(id);
    res.json({ success: true, id, zpl });
  } catch(err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/print/test
// Prints a single test wristband
router.get("/print/test", async (req, res) => {
  try {
    const results = await printWristbands(["WB-TEST"], new Date().toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" }));
    res.json({ success: true, message: "Test wristband sent to printer", results });
  } catch(err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════
//  RECEIPT GENERATOR
// ══════════════════════════════════════════════════════════════════

// GET /api/receipt/:order_id
// Returns receipt data for an order
router.get("/receipt/:order_id", (req, res) => {
  try {
    const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(req.params.order_id);
    if (!order) return res.status(404).json({ success: false, error: "Order not found" });

    const visit  = db.prepare("SELECT * FROM visits WHERE id = ?").get(order.visit_id);
    const photo  = db.prepare("SELECT * FROM photos WHERE id = ?").get(order.photo_id);

    // Generate sequential receipt number
    const rcpNum = db.prepare(`
      SELECT COUNT(*) as cnt FROM orders
      WHERE date(created_at) = date('now','localtime')
      AND id <= ?
    `).get(order.id)?.cnt || 1;

    const dateStr = new Date(order.created_at).toLocaleString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit", hour12: true
    });

    const parkName    = process.env.PARK_NAME    || "RideSnap Park";
    const parkSubtitle = process.env.PARK_SUBTITLE || "Ride Photo Service";
    const parkPhone   = process.env.PARK_PHONE   || "";
    const parkEmail   = process.env.PARK_EMAIL   || "";
    const parkAddress = process.env.PARK_ADDRESS || "";

    const typeLabels  = { digital:"Digital Copy", print:"Print Copy", frame:"Framed Print", combo:"Combo Pack" };
    const payLabels   = { cash:"Cash", upi:"UPI", card:"Card / Swipe", split:"Split Payment", razorpay:"Online" };

    // Tax calculation — 18% GST inclusive breakdown
    // SAC: 998386 — Photography Services
    // Even without GST registration, show for professional reference
    const gstRate    = 18;
    const baseAmount = Math.round((order.price * 100) / (100 + gstRate) * 100) / 100;
    const gstAmount  = Math.round((order.price - baseAmount) * 100) / 100;
    const cgst       = Math.round((gstAmount / 2) * 100) / 100;
    const sgst       = Math.round((gstAmount / 2) * 100) / 100;

    // Parse split payments if any
    let paymentDetails = payLabels[order.payment_mode] || order.payment_mode || "Cash";
    if (order.payment_mode === "split" && order.payment_splits) {
      try {
        const splits = JSON.parse(order.payment_splits);
        paymentDetails = splits.map(s => `${payLabels[s.mode]||s.mode} ₹${s.amount}`).join(" + ");
      } catch(e) {}
    }

    res.json({
      success: true,
      receipt: {
        receipt_no:      `RCP-${new Date().getFullYear()}-${String(rcpNum).padStart(4,"0")}`,
        order_id:        order.id,
        date:            dateStr,
        park_name:       parkName,
        park_subtitle:   parkSubtitle,
        park_phone:      parkPhone,
        park_address:    parkAddress,
        guest_name:      visit?.guest_name || "Guest",
        guest_phone:     visit?.phone || "",
        guest_email:     visit?.email && !visit.email.includes('wonderla.com') ? visit.email : "",
        wristband_id:    order.visit_id,
        item_name:       typeLabels[order.order_type] || order.order_type,
        ride_name:       photo?.ride_name || "",
        amount:          order.price,
        payment_mode:    paymentDetails,
        payment_status:  order.payment_status,
        sac_code:        "998386",
        gst_note:        "GST not registered. Prices are inclusive of all taxes.",
        base_amount:     baseAmount,
        cgst_rate:       9,
        cgst_amount:     cgst,
        sgst_rate:       9,
        sgst_amount:     sgst,
        total_tax:       gstAmount,
        note:            "This is not a GST invoice. (For reference only)",
        footer:          "Thank you for visiting " + parkName + "!",
        validity:        order.order_type === "digital" || order.order_type === "combo"
                         ? "Download link valid for 7 days" : "Collect print at counter",
      }
    });
  } catch(err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════
//  FINANCIAL REPORT
// ══════════════════════════════════════════════════════════════════

// GET /api/reports/daily?date=2026-03-21
// Returns full financial summary for a date
router.get("/reports/daily", (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().split("T")[0];

    // All orders for the day
    const orders = db.prepare(`
      SELECT o.*, v.guest_name, v.phone, p.ride_name, p.s3_url
      FROM orders o
      LEFT JOIN visits v ON v.id = o.visit_id
      LEFT JOIN photos p ON p.id = o.photo_id
      WHERE date(o.created_at) = ?
      ORDER BY o.created_at ASC
    `).all(date);

    // Summary stats
    const totalRevenue = orders.reduce((s, o) => s + (o.price || 0), 0);
    const totalOrders  = orders.length;

    // By payment mode
    const byPayment = {};
    orders.forEach(o => {
      const mode = o.payment_mode || "cash";
      if (!byPayment[mode]) byPayment[mode] = { count: 0, amount: 0 };
      byPayment[mode].count  += 1;
      byPayment[mode].amount += o.price || 0;
    });

    // By order type
    const byType = {};
    orders.forEach(o => {
      if (!byType[o.order_type]) byType[o.order_type] = { count: 0, amount: 0 };
      byType[o.order_type].count  += 1;
      byType[o.order_type].amount += o.price || 0;
    });

    // By ride
    const byRide = {};
    orders.forEach(o => {
      const ride = o.ride_name || "Unknown";
      if (!byRide[ride]) byRide[ride] = { count: 0, amount: 0 };
      byRide[ride].count  += 1;
      byRide[ride].amount += o.price || 0;
    });

    // Hourly breakdown
    const byHour = {};
    orders.forEach(o => {
      const hour = new Date(o.created_at).getHours();
      const label = `${String(hour).padStart(2,"0")}:00`;
      if (!byHour[label]) byHour[label] = { count: 0, amount: 0 };
      byHour[label].count  += 1;
      byHour[label].amount += o.price || 0;
    });

    res.json({
      success: true,
      report: {
        date,
        park_name:      process.env.PARK_NAME || "RideSnap Park",
        generated_at:   new Date().toISOString(),
        summary: {
          total_orders:  totalOrders,
          total_revenue: totalRevenue,
          avg_order:     totalOrders ? Math.round(totalRevenue / totalOrders) : 0,
        },
        by_payment: byPayment,
        by_type:    byType,
        by_ride:    byRide,
        by_hour:    byHour,
        orders,     // full order list for Excel export
      }
    });
  } catch(err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get("/health", (req, res) => {
  res.json({ success: true, status: "RideSnap API running 🚀", time: new Date().toISOString() });
});

// ══════════════════════════════════════════════════════════════════
//  AUTH  –  Login / Logout / Verify
// ══════════════════════════════════════════════════════════════════

// Helper: generate token
function makeToken() {
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// Helper: verify token from request header or query
function verifyToken(req) {
  const token = req.headers['x-auth-token'] || req.query.token;
  if (!token) return null;
  const session = db.prepare("SELECT * FROM sessions WHERE token = ?").get(token);
  if (!session) return null;
  if (new Date() > new Date(session.expires_at)) {
    db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
    return null;
  }
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(session.user_id);
  return user?.active ? { ...user, token } : null;
}

// POST /api/auth/login
router.post("/auth/login", (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res.status(400).json({ success: false, error: "Username and password required" });

    const user = db.prepare("SELECT * FROM users WHERE username = ? AND active = 1").get(username.trim());
    if (!user || user.password !== password)
      return res.status(401).json({ success: false, error: "Invalid username or password" });

    // Create session token — expires in 12 hours
    const token     = makeToken();
    const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString();
    db.prepare("INSERT INTO sessions (token, user_id, role, expires_at) VALUES (?, ?, ?, ?)")
      .run(token, user.id, user.role, expiresAt);

    // Update last login
    db.prepare("UPDATE users SET last_login = datetime('now','localtime') WHERE id = ?").run(user.id);

    console.log(`🔐 Login: ${user.name} (${user.role})`);
    res.json({
      success: true,
      token,
      user: { id: user.id, name: user.name, username: user.username, role: user.role },
      expires_at: expiresAt,
    });
  } catch(err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/auth/logout
router.post("/auth/logout", (req, res) => {
  const token = req.headers['x-auth-token'] || req.body.token;
  if (token) db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
  res.json({ success: true, message: "Logged out" });
});

// GET /api/auth/verify
router.get("/auth/verify", (req, res) => {
  const user = verifyToken(req);
  if (!user) return res.status(401).json({ success: false, error: "Invalid or expired session" });
  res.json({ success: true, user: { id: user.id, name: user.name, username: user.username, role: user.role } });
});

// ══════════════════════════════════════════════════════════════════
//  USER MANAGEMENT  –  Admin only
// ══════════════════════════════════════════════════════════════════

// GET /api/users  →  List all users (admin only)
router.get("/users", (req, res) => {
  try {
    const caller = verifyToken(req);
    if (!caller || caller.role !== 'admin')
      return res.status(403).json({ success: false, error: "Admin access required" });
    const users = db.prepare("SELECT id,username,role,name,active,created_at,last_login FROM users ORDER BY created_at ASC").all();
    res.json({ success: true, users });
  } catch(err) { res.status(500).json({ success: false, error: err.message }); }
});

// POST /api/users  →  Create user (admin only)
router.post("/users", (req, res) => {
  try {
    const caller = verifyToken(req);
    if (!caller || caller.role !== 'admin')
      return res.status(403).json({ success: false, error: "Admin access required" });

    const { username, password, role, name } = req.body;
    const validRoles = ['admin','photographer','counter','print'];
    if (!username || !password || !role)
      return res.status(400).json({ success: false, error: "username, password, role required" });
    if (!validRoles.includes(role))
      return res.status(400).json({ success: false, error: `Role must be: ${validRoles.join(', ')}` });

    const existing = db.prepare("SELECT id FROM users WHERE username = ?").get(username.trim());
    if (existing) return res.status(409).json({ success: false, error: "Username already exists" });

    const id = "USR-" + Math.random().toString(36).slice(2,8).toUpperCase();
    db.prepare("INSERT INTO users (id, username, password, role, name) VALUES (?, ?, ?, ?, ?)")
      .run(id, username.trim(), password, role, name || username);

    res.json({ success: true, user: { id, username, role, name: name||username } });
  } catch(err) { res.status(500).json({ success: false, error: err.message }); }
});

// PATCH /api/users/:id  →  Update user (admin only)
router.patch("/users/:id", (req, res) => {
  try {
    const caller = verifyToken(req);
    if (!caller || caller.role !== 'admin')
      return res.status(403).json({ success: false, error: "Admin access required" });

    const { password, role, name, active } = req.body;
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.params.id);
    if (!user) return res.status(404).json({ success: false, error: "User not found" });

    db.prepare(`UPDATE users SET
      password = COALESCE(?, password),
      role     = COALESCE(?, role),
      name     = COALESCE(?, name),
      active   = COALESCE(?, active)
      WHERE id = ?`).run(password||null, role||null, name||null, active??null, req.params.id);

    // If deactivated — kill all their sessions
    if (active === 0) db.prepare("DELETE FROM sessions WHERE user_id = ?").run(req.params.id);

    const updated = db.prepare("SELECT id,username,role,name,active FROM users WHERE id = ?").get(req.params.id);
    res.json({ success: true, user: updated });
  } catch(err) { res.status(500).json({ success: false, error: err.message }); }
});

// DELETE /api/users/:id  →  Delete user (admin only, can't delete self)
router.delete("/users/:id", (req, res) => {
  try {
    const caller = verifyToken(req);
    if (!caller || caller.role !== 'admin')
      return res.status(403).json({ success: false, error: "Admin access required" });
    if (caller.id === req.params.id)
      return res.status(400).json({ success: false, error: "Cannot delete your own account" });

    db.prepare("DELETE FROM sessions WHERE user_id = ?").run(req.params.id);
    db.prepare("DELETE FROM users WHERE id = ?").run(req.params.id);
    res.json({ success: true, message: "User deleted" });
  } catch(err) { res.status(500).json({ success: false, error: err.message }); }
});

// ══════════════════════════════════════════════════════════════════
//  SHORT LINKS  –  yourdomain.com/p/ABC123 → S3 photo URL
// ══════════════════════════════════════════════════════════════════

// Helper: generate short code
function makeCode(len = 6) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no confusing chars
  let code = "";
  for (let i = 0; i < len; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

// Helper: create or reuse short link for an order
function getOrCreateShortLink(order_id, photo_id, visit_id) {
  // Check if short link already exists for this order
  const existing = db.prepare("SELECT * FROM short_links WHERE order_id = ?").get(order_id);
  if (existing) return existing.code;

  // Generate unique code
  let code;
  let attempts = 0;
  do {
    code = makeCode(6);
    attempts++;
  } while (db.prepare("SELECT code FROM short_links WHERE code = ?").get(code) && attempts < 10);

  // Expires 7 days from now
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  db.prepare(`
    INSERT INTO short_links (code, order_id, photo_id, visit_id, expires_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(code, order_id, photo_id, visit_id, expiresAt);

  return code;
}

// GET /p/:code  →  Redirect to actual S3 photo URL
// This is the public redirect route — no /api prefix!
router.get("/p/:code", async (req, res) => {
  try {
    const code = req.params.code.toUpperCase().trim();
    const link = db.prepare("SELECT * FROM short_links WHERE code = ?").get(code);

    if (!link) {
      return res.status(404).send(`
        <html><body style="font-family:Arial;text-align:center;padding:60px;background:#0a0f1e;color:#fff">
          <h2>❌ Link not found</h2>
          <p style="color:#666">This link may have expired or is invalid.</p>
        </body></html>
      `);
    }

    // Check expiry
    if (new Date() > new Date(link.expires_at)) {
      return res.status(410).send(`
        <html><body style="font-family:Arial;text-align:center;padding:60px;background:#0a0f1e;color:#fff">
          <h2>⏰ Link Expired</h2>
          <p style="color:#666">This download link has expired (7 days).<br/>Please visit our photo desk for assistance.</p>
        </body></html>
      `);
    }

    // Track click
    db.prepare("UPDATE short_links SET clicks = clicks + 1 WHERE code = ?").run(code);

    // Get photo and generate fresh presigned URL (24 hour validity for redirect)
    const photo       = db.prepare("SELECT * FROM photos WHERE id = ?").get(link.photo_id);
    const downloadUrl = await getPresignedReadUrl(photo.s3_key, 24 * 3600);

    // Serve a nice download page instead of raw redirect
    const visit    = db.prepare("SELECT * FROM visits WHERE id = ?").get(link.visit_id);
    const parkName = process.env.PARK_NAME || "RideSnap Park";
    const guest    = visit?.guest_name || "Guest";

    return res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
        <title>Your Ride Photo – ${parkName}</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { background: #0a0f1e; font-family: Arial, sans-serif; min-height: 100vh;
                 display: flex; align-items: center; justify-content: center; padding: 20px; }
          .card { background: #0d1829; border: 1px solid #1e293b; border-radius: 20px;
                  padding: 32px 24px; max-width: 420px; width: 100%; text-align: center; }
          .park  { color: #facc15; font-size: 13px; letter-spacing: 3px; text-transform: uppercase; margin-bottom: 8px; }
          .title { color: #f1f5f9; font-size: 22px; font-weight: 800; margin-bottom: 6px; }
          .sub   { color: #475569; font-size: 13px; margin-bottom: 24px; }
          .photo { width: 100%; border-radius: 12px; margin-bottom: 24px; max-height: 300px; object-fit: cover; }
          .dl-btn {
            display: block; width: 100%; padding: 16px;
            background: #facc15; color: #0f172a; border-radius: 12px;
            text-decoration: none; font-weight: 800; font-size: 16px;
            letter-spacing: 1px; margin-bottom: 12px;
          }
          .info  { color: #334155; font-size: 11px; margin-top: 16px; line-height: 1.8; }
          .ride  { display: inline-block; background: #1e293b; color: #94a3b8;
                   padding: 4px 12px; border-radius: 20px; font-size: 11px; margin-bottom: 20px; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="park">📸 ${parkName}</div>
          <div class="title">Hi ${guest}! 👋</div>
          <div class="sub">Your ride photo is ready to download</div>
          <span class="ride">🎢 ${photo.ride_name}</span>
          <img class="photo" src="${downloadUrl}" alt="Your ride photo"/>
          <a class="dl-btn" href="${downloadUrl}" download>⬇️ Download Full Photo</a>
          <div class="info">
            This link expires on ${new Date(link.expires_at).toLocaleDateString("en-IN", {day:"2-digit",month:"short",year:"numeric"})}<br/>
            Thank you for visiting ${parkName}! 🎉
          </div>
        </div>
      </body>
      </html>
    `);

  } catch (err) {
    console.error("Short link error:", err);
    res.status(500).send("Something went wrong. Please try again.");
  }
});

// GET /api/config  →  Returns park config + live prices from .env
// Frontend uses this so prices are always in sync with .env
router.get("/config", (req, res) => {
  res.json({
    success:   true,
    park_name: process.env.PARK_NAME || "RideSnap Park",
    prices: {
      digital: parseInt(process.env.PRICE_DIGITAL) || 150,
      print:   parseInt(process.env.PRICE_PRINT)   || 250,
      frame:   parseInt(process.env.PRICE_FRAME)   || 350,
      combo:   parseInt(process.env.PRICE_COMBO)   || 499,
    },
    payment: {
      upi_id:   process.env.UPI_ID   || "",
      upi_name: process.env.UPI_NAME || "Park",
    },
  });
});

// ══════════════════════════════════════════════════════════════════
//  GUEST DETAILS  –  Save name/phone/email to visit record
// ══════════════════════════════════════════════════════════════════

// PATCH /api/visits/:id/details
// Body: { guest_name, phone, email }
// Called from photo-desk when guest provides details at counter
router.patch("/visits/:id/details", (req, res) => {
  try {
    const { guest_name, phone, email } = req.body;
    const id = req.params.id.toUpperCase().trim();

    // Upsert — create visit if not exists (wristband may not have been used for photo)
    const existing = db.prepare("SELECT * FROM visits WHERE id = ?").get(id);
    if (existing) {
      db.prepare(`
        UPDATE visits SET
          guest_name = COALESCE(?, guest_name),
          phone      = COALESCE(?, phone),
          email      = COALESCE(?, email)
        WHERE id = ?
      `).run(guest_name || null, phone || null, email || null, id);
    } else {
      db.prepare(`INSERT INTO visits (id, guest_name, phone, email) VALUES (?, ?, ?, ?)`)
        .run(id, guest_name || "Guest", phone || null, email || null);
    }

    const visit = db.prepare("SELECT * FROM visits WHERE id = ?").get(id);
    res.json({ success: true, visit });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════
//  SEND PHOTO LINK  –  Email / WhatsApp / SMS
// ══════════════════════════════════════════════════════════════════

// POST /api/send/email
// Body: { order_id, email }
router.post("/send/email", async (req, res) => {
  try {
    const { order_id, email } = req.body;
    if (!order_id || !email) return res.status(400).json({ success: false, error: "order_id and email required" });

    const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(order_id);
    if (!order) return res.status(404).json({ success: false, error: "Order not found" });

    const photo = db.prepare("SELECT * FROM photos WHERE id = ?").get(order.photo_id);
    const visit = db.prepare("SELECT * FROM visits WHERE id = ?").get(order.visit_id);

    // Generate fresh 7-day presigned download URL
    const downloadUrl = await getPresignedReadUrl(photo.s3_key, 7 * 24 * 3600);

    const rcpCnt = db.prepare(`SELECT COUNT(*) as cnt FROM orders WHERE date(created_at)=date('now','localtime') AND id<=?`).get(order_id)?.cnt || 1;
    await sendReceiptWithPhoto({
      to:          email,
      guestName:   visit?.guest_name || "Guest",
      photoUrl:    downloadUrl,
      orderId:     order_id,
      rideName:    photo.ride_name,
      orderType:   order.order_type,
      price:       order.price,
      paymentMode: order.payment_mode || "cash",
      wristbandId: order.visit_id,
      receiptNo:   `RCP-${new Date().getFullYear()}-${String(rcpCnt).padStart(4,"0")}`,
      date:        new Date(order.created_at).toLocaleString("en-IN", { day:"2-digit", month:"short", year:"numeric", hour:"2-digit", minute:"2-digit", hour12:true }),
    });

    // Update visit email if not saved
    if (email) db.prepare("UPDATE visits SET email = ? WHERE id = ? AND email IS NULL").run(email, order.visit_id);
    db.prepare("UPDATE orders SET email_sent = 1 WHERE id = ?").run(order_id);

    console.log(`📧 Email sent to ${email} for order ${order_id}`);
    res.json({ success: true, message: `Email sent to ${email}` });

  } catch (err) {
    console.error("Email send error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/send/sms
// Body: { order_id, phone }
// Uses Fast2SMS — sends SHORT link instead of raw S3 URL (TRAI compliant)
router.post("/send/sms", async (req, res) => {
  try {
    const { order_id, phone } = req.body;
    if (!order_id || !phone) return res.status(400).json({ success: false, error: "order_id and phone required" });

    const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(order_id);
    if (!order) return res.status(404).json({ success: false, error: "Order not found" });

    const photo = db.prepare("SELECT * FROM photos WHERE id = ?").get(order.photo_id);
    const visit = db.prepare("SELECT * FROM visits WHERE id = ?").get(order.visit_id);

    // Create short link — e.g. ABC123
    const code      = getOrCreateShortLink(order_id, order.photo_id, order.visit_id);
    const baseUrl   = process.env.BASE_URL || "http://localhost:5000";
    const shortUrl  = `${baseUrl}/p/${code}`;

    const parkName  = process.env.PARK_NAME || "RideSnap Park";
    const guestName = visit?.guest_name || "Guest";

    // Short, clean message — TRAI friendly, fits in 1 SMS (160 chars)
    const message = `Hi ${guestName}! Your ride photo from ${parkName} is ready. Download (7 days): ${shortUrl}`;

    // Fast2SMS API
    const fast2smsKey = process.env.FAST2SMS_KEY;
    if (!fast2smsKey) throw new Error("FAST2SMS_KEY not set in .env");

    const smsRes = await fetch("https://www.fast2sms.com/dev/bulkV2", {
      method:  "POST",
      headers: { "authorization": fast2smsKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        route:    "q",
        message,
        language: "english",
        flash:    0,
        numbers:  phone.replace(/[^0-9]/g, "").slice(-10),
      }),
    });

    const smsData = await smsRes.json();
    if (!smsData.return) throw new Error(smsData.message || "SMS failed");

    if (phone) db.prepare("UPDATE visits SET phone = ? WHERE id = ? AND phone IS NULL").run(phone, order.visit_id);

    console.log(`📱 SMS sent to ${phone} → ${shortUrl}`);
    res.json({ success: true, message: `SMS sent to ${phone}`, short_url: shortUrl });

  } catch (err) {
    console.error("SMS error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/send/whatsapp-link
// Generates a wa.me link with pre-filled message + photo URL
// Returns the link — frontend opens it
router.post("/send/whatsapp-link", async (req, res) => {
  try {
    const { order_id, phone } = req.body;
    if (!order_id) return res.status(400).json({ success: false, error: "order_id required" });

    const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(order_id);
    if (!order) return res.status(404).json({ success: false, error: "Order not found" });

    const photo = db.prepare("SELECT * FROM photos WHERE id = ?").get(order.photo_id);
    const visit = db.prepare("SELECT * FROM visits WHERE id = ?").get(order.visit_id);

    // Use short link — cleaner for WhatsApp too
    const code        = getOrCreateShortLink(order_id, order.photo_id, order.visit_id);
    const baseUrl     = process.env.BASE_URL || "http://localhost:5000";
    const shortUrl    = `${baseUrl}/p/${code}`;
    const parkName    = process.env.PARK_NAME || "RideSnap Park";
    const guestName   = visit?.guest_name || "there";

    const message = `Hi ${guestName}! 🎢 Your ride photo from *${parkName}* is ready!\n\n📸 Ride: ${photo.ride_name}\n\n⬇️ Download your photo (valid 7 days):\n${shortUrl}\n\nThank you for visiting ${parkName}! 🎉`;

    // Build wa.me URL
    const cleanPhone = phone ? phone.replace(/[^0-9]/g, "") : "";
    const waLink = cleanPhone
      ? `https://wa.me/91${cleanPhone.slice(-10)}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;

    res.json({ success: true, whatsapp_url: waLink, message });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
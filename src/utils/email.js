// src/utils/email.js
const nodemailer = require("nodemailer");
require("dotenv").config();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ── Park config helpers ───────────────────────────────────────────
const park = () => ({
  name:    process.env.PARK_NAME     || "RideSnap Park",
  sub:     process.env.PARK_SUBTITLE || "Ride Photo Service",
  addr:    process.env.PARK_ADDRESS  || "",
  phone:   process.env.PARK_PHONE    || "",
  email:   process.env.PARK_EMAIL    || "",
  website: process.env.PARK_WEBSITE  || "",
});

// ── GST breakdown (18% inclusive) ────────────────────────────────
function gst(amount) {
  const base = +(amount * 100 / 118).toFixed(2);
  const cgst = +(amount * 9  / 118).toFixed(2);
  const sgst = +(amount * 9  / 118).toFixed(2);
  const tax  = +(cgst + sgst).toFixed(2);
  return { base, cgst, sgst, tax };
}

// ── Type / Payment labels ─────────────────────────────────────────
const typeLabel = { digital:"Digital Copy", print:"Print Copy", frame:"Framed Print", combo:"Combo Pack" };
const payLabel  = { cash:"Cash", upi:"UPI / QR", card:"Card / Swipe", split:"Split Payment", razorpay:"Online" };

// ══════════════════════════════════════════════════════════════════
//  MAIN: Send Receipt + Photo (called when order is placed)
// ══════════════════════════════════════════════════════════════════
async function sendReceiptWithPhoto({
  to, guestName, photoUrl, orderId, rideName,
  orderType, price, paymentMode, wristbandId,
  receiptNo, date
}) {
  if (!to || !to.includes("@")) throw new Error("Invalid email address");

  const p         = park();
  const g         = gst(price);
  const isDigital = orderType === "digital" || orderType === "combo";
  const isPrint   = orderType === "print"   || orderType === "frame" || orderType === "combo";
  const item      = typeLabel[orderType]    || orderType;
  const payment   = payLabel[paymentMode]   || paymentMode || "Cash";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>Receipt – ${p.name}</title>
</head>
<body style="margin:0;padding:0;background:#f0efed;font-family:Arial,sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0efed;padding:24px 0;">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;">

  <!-- ── HEADER ── -->
  <tr>
    <td style="background:#1a1a1a;border-radius:14px 14px 0 0;padding:28px 24px;text-align:center;">
      <div style="font-size:38px;margin-bottom:8px;">📸</div>
      <div style="color:#f59e0b;font-size:20px;font-weight:900;letter-spacing:1px;margin-bottom:4px;">${p.name}</div>
      <div style="color:#888;font-size:11px;letter-spacing:3px;text-transform:uppercase;">${p.sub}</div>
      ${p.addr    ? `<div style="color:#555;font-size:11px;margin-top:8px;">${p.addr}</div>` : ''}
      ${p.phone   ? `<div style="color:#555;font-size:11px;margin-top:2px;">☎ ${p.phone}</div>` : ''}
      ${p.website ? `<div style="color:#555;font-size:11px;margin-top:2px;">${p.website}</div>` : ''}
    </td>
  </tr>

  <!-- ── RECEIPT BODY (white paper) ── -->
  <tr>
    <td style="background:#ffffff;padding:0 24px;border-left:1px solid #e5e2db;border-right:1px solid #e5e2db;">

      <!-- Greeting -->
      <table width="100%" cellpadding="0" cellspacing="0" style="padding:20px 0 12px;">
        <tr>
          <td style="font-size:14px;color:#1a1a1a;line-height:1.7;">
            Hi <strong>${guestName || "Guest"}</strong> 👋<br/>
            Thank you for visiting <strong>${p.name}</strong>!<br/>
            <span style="font-size:12px;color:#888;">Your purchase details are below.</span>
          </td>
        </tr>
      </table>

      <!-- Solid divider -->
      <table width="100%" cellpadding="0" cellspacing="0"><tr><td style="border-top:1px solid #ccc;padding:0;font-size:0;">&nbsp;</td></tr></table>

      <!-- Receipt No + Date -->
      <table width="100%" cellpadding="0" cellspacing="0" style="padding:12px 0;">
        <tr>
          <td style="font-size:10px;color:#888;letter-spacing:1px;">RECEIPT NO<br/><strong style="font-size:12px;color:#1a1a1a;font-family:monospace;">${receiptNo || orderId}</strong></td>
          <td align="right" style="font-size:10px;color:#888;letter-spacing:1px;">DATE &amp; TIME<br/><strong style="font-size:12px;color:#1a1a1a;">${date || new Date().toLocaleDateString("en-IN")}</strong></td>
        </tr>
      </table>

      <!-- Dashed divider -->
      <table width="100%" cellpadding="0" cellspacing="0"><tr><td style="border-top:1px dashed #ccc;padding:0;font-size:0;">&nbsp;</td></tr></table>

      <!-- Guest Details -->
      <table width="100%" cellpadding="0" cellspacing="0" style="padding:12px 0;">
        <tr><td colspan="2" style="font-size:9px;color:#888;letter-spacing:2px;text-transform:uppercase;padding-bottom:6px;">GUEST DETAILS</td></tr>
        ${guestName ? `<tr><td style="font-size:11px;color:#888;padding:2px 0;">Name</td><td align="right" style="font-size:11px;font-weight:700;">${guestName}</td></tr>` : ''}
        <tr><td style="font-size:11px;color:#888;padding:2px 0;">Wristband</td><td align="right" style="font-size:11px;font-weight:700;font-family:monospace;">${wristbandId}</td></tr>
        <tr><td style="font-size:11px;color:#888;padding:2px 0;">Ride</td><td align="right" style="font-size:11px;font-weight:700;">🎢 ${rideName}</td></tr>
      </table>

      <!-- Dashed divider -->
      <table width="100%" cellpadding="0" cellspacing="0"><tr><td style="border-top:1px dashed #ccc;padding:0;font-size:0;">&nbsp;</td></tr></table>

      <!-- Item -->
      <table width="100%" cellpadding="0" cellspacing="0" style="padding:12px 0;">
        <tr><td colspan="2" style="font-size:9px;color:#888;letter-spacing:2px;text-transform:uppercase;padding-bottom:8px;">ITEM PURCHASED</td></tr>
        <tr>
          <td style="font-size:13px;font-weight:700;color:#1a1a1a;">${item}</td>
          <td align="right" style="font-size:14px;font-weight:700;color:#1a1a1a;">₹${price}</td>
        </tr>
      </table>

      <!-- Dashed divider -->
      <table width="100%" cellpadding="0" cellspacing="0"><tr><td style="border-top:1px dashed #ccc;padding:0;font-size:0;">&nbsp;</td></tr></table>

      <!-- Tax Breakup -->
      <table width="100%" cellpadding="0" cellspacing="0" style="padding:12px 0;">
        <tr><td colspan="2" style="font-size:9px;color:#888;letter-spacing:2px;text-transform:uppercase;padding-bottom:6px;">TAX BREAKUP (FOR REFERENCE)</td></tr>
        <tr>
          <td style="font-size:10px;color:#888;padding:2px 0;">Base Amount</td>
          <td align="right" style="font-size:10px;color:#888;">₹${g.base.toFixed(2)}</td>
        </tr>
        <tr>
          <td style="font-size:10px;color:#888;padding:2px 0;">CGST @ 9%</td>
          <td align="right" style="font-size:10px;color:#888;">₹${g.cgst.toFixed(2)}</td>
        </tr>
        <tr>
          <td style="font-size:10px;color:#888;padding:2px 0;">SGST @ 9%</td>
          <td align="right" style="font-size:10px;color:#888;">₹${g.sgst.toFixed(2)}</td>
        </tr>
        <tr>
          <td colspan="2" style="border-top:1px dashed #e5e2db;padding-top:6px;font-size:0;">&nbsp;</td>
        </tr>
        <tr>
          <td style="font-size:11px;font-weight:700;color:#1a1a1a;">Total Tax (18%)</td>
          <td align="right" style="font-size:11px;font-weight:700;color:#1a1a1a;">₹${g.tax.toFixed(2)}</td>
        </tr>
        <tr>
          <td colspan="2" style="font-size:9px;color:#aaa;font-style:italic;padding-top:4px;">
            GST not registered. Prices inclusive of all taxes.
          </td>
        </tr>
      </table>

      <!-- Solid divider -->
      <table width="100%" cellpadding="0" cellspacing="0"><tr><td style="border-top:2px solid #1a1a1a;padding:0;font-size:0;">&nbsp;</td></tr></table>

      <!-- TOTAL -->
      <table width="100%" cellpadding="0" cellspacing="0" style="padding:10px 0;">
        <tr>
          <td style="font-size:14px;font-weight:900;color:#1a1a1a;letter-spacing:1px;">TOTAL PAID</td>
          <td align="right" style="font-size:24px;font-weight:900;color:#f59e0b;">₹${price}</td>
        </tr>
      </table>

      <!-- Solid divider -->
      <table width="100%" cellpadding="0" cellspacing="0"><tr><td style="border-top:2px solid #1a1a1a;padding:0;font-size:0;">&nbsp;</td></tr></table>

      <!-- Payment -->
      <table width="100%" cellpadding="0" cellspacing="0" style="padding:10px 0;">
        <tr>
          <td style="font-size:11px;color:#888;">Payment</td>
          <td align="right" style="font-size:11px;font-weight:700;">${payment}</td>
        </tr>
        <tr>
          <td style="font-size:11px;color:#888;padding-top:4px;">Status</td>
          <td align="right" style="padding-top:4px;">
            <span style="background:#f0fdf4;color:#16a34a;border:1px solid #bbf7d0;font-size:9px;font-weight:700;padding:2px 10px;border-radius:20px;letter-spacing:1px;">✓ PAID</span>
          </td>
        </tr>
      </table>

      <!-- Dashed divider -->
      <table width="100%" cellpadding="0" cellspacing="0"><tr><td style="border-top:1px dashed #ccc;padding:0;font-size:0;">&nbsp;</td></tr></table>

      ${isDigital && photoUrl ? `
      <!-- Download Button -->
      <table width="100%" cellpadding="0" cellspacing="0" style="padding:16px 0;">
        <tr><td align="center" style="font-size:11px;color:#888;padding-bottom:12px;">📱 Your photo is ready to download!</td></tr>
        <tr>
          <td align="center">
            <a href="${photoUrl}" style="display:inline-block;background:#f59e0b;color:#000;padding:14px 40px;border-radius:10px;text-decoration:none;font-weight:900;font-size:15px;letter-spacing:1px;">
              ⬇️ Download Full Photo
            </a>
          </td>
        </tr>
        <tr><td align="center" style="font-size:9px;color:#aaa;padding-top:8px;">Download link valid for 7 days</td></tr>
      </table>

      <!-- Dashed divider -->
      <table width="100%" cellpadding="0" cellspacing="0"><tr><td style="border-top:1px dashed #ccc;padding:0;font-size:0;">&nbsp;</td></tr></table>
      ` : ''}

      ${isPrint ? `
      <!-- Print Notice -->
      <table width="100%" cellpadding="0" cellspacing="0" style="padding:12px 0;">
        <tr>
          <td align="center" style="background:#eff6ff;border:1px dashed #93c5fd;border-radius:8px;padding:12px;font-size:12px;color:#1e40af;line-height:1.7;">
            🖨️ <strong>Print Ready</strong><br/>
            Please collect your print at the<br/><strong>Photo Counter</strong>
          </td>
        </tr>
      </table>

      <!-- Dashed divider -->
      <table width="100%" cellpadding="0" cellspacing="0"><tr><td style="border-top:1px dashed #ccc;padding:0;font-size:0;">&nbsp;</td></tr></table>
      ` : ''}

      <!-- Notice -->
      <table width="100%" cellpadding="0" cellspacing="0" style="padding:10px 0;">
        <tr>
          <td align="center" style="font-size:9px;color:#aaa;font-style:italic;line-height:1.7;">
            This is not a GST invoice. For reference only.<br/>
            Order Ref: <span style="font-family:monospace;">${orderId}</span>
            ${p.phone ? `<br/>For queries: ${p.phone}` : ''}
          </td>
        </tr>
      </table>

    </td>
  </tr>

  <!-- ── FOOTER (dark) ── -->
  <tr>
    <td style="background:#1a1a1a;border-radius:0 0 14px 14px;padding:20px 24px;text-align:center;">
      <div style="color:#f59e0b;font-size:15px;font-weight:900;margin-bottom:4px;">Thank you for visiting!</div>
      <div style="color:#888;font-size:12px;margin-bottom:6px;">${p.name}</div>
      <div style="color:#555;font-size:11px;line-height:1.7;">
        We hope to see you again soon. 🎉<br/>
        ${p.website ? `<a href="http://${p.website}" style="color:#f59e0b;text-decoration:none;">${p.website}</a>` : ''}
      </div>
    </td>
  </tr>

  <!-- Spacer -->
  <tr><td style="height:24px;"></td></tr>

</table>
</td></tr>
</table>

</body>
</html>`;

  await transporter.sendMail({
    from:    `${park().name} <${process.env.EMAIL_USER}>`,
    to,
    subject: `✅ Receipt + Photo Ready · ${park().name} · ${receiptNo || orderId}`,
    html,
  });

  console.log(`📧 Receipt + photo sent to ${to} for order ${orderId}`);
}

// ══════════════════════════════════════════════════════════════════
//  sendPhotoLink — simple photo only (used by manual resend)
// ══════════════════════════════════════════════════════════════════
async function sendPhotoLink({ to, guestName, photoUrl, orderId, rideName, parkName }) {
  if (!to || !to.includes("@")) throw new Error("Invalid email address");
  const p = park();

  const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:24px;background:#f0efed;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;">
  <tr>
    <td style="background:#1a1a1a;border-radius:14px 14px 0 0;padding:28px;text-align:center;">
      <div style="font-size:36px;margin-bottom:8px;">📸</div>
      <div style="color:#f59e0b;font-size:20px;font-weight:900;">${parkName || p.name}</div>
      <div style="color:#888;font-size:11px;letter-spacing:3px;">RIDE PHOTO SERVICE</div>
    </td>
  </tr>
  <tr>
    <td style="background:#fff;padding:24px;border:1px solid #e5e2db;border-top:none;border-radius:0 0 14px 14px;">
      <p style="font-size:15px;color:#1a1a1a;margin:0 0 8px;">Hi <strong>${guestName || "Guest"}</strong> 👋</p>
      <p style="font-size:13px;color:#888;margin:0 0 20px;">Your ride photo from <strong style="color:#1a1a1a;">🎢 ${rideName}</strong> is ready!</p>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td align="center" style="padding:16px 0;">
            <a href="${photoUrl}" style="background:#f59e0b;color:#000;padding:14px 40px;border-radius:10px;text-decoration:none;font-weight:900;font-size:15px;">
              ⬇️ Download Full Photo
            </a>
          </td>
        </tr>
      </table>
      <p style="font-size:10px;color:#aaa;text-align:center;margin:0;">
        Valid for 7 days · Order: <span style="font-family:monospace;">${orderId}</span>
      </p>
    </td>
  </tr>
  <tr><td style="height:20px;"></td></tr>
</table>
</td></tr>
</table>
</body></html>`;

  await transporter.sendMail({
    from:    `${p.name} <${process.env.EMAIL_USER}>`,
    to,
    subject: `📸 Your Ride Photo is Ready · ${parkName || p.name}`,
    html,
  });
  console.log(`📧 Photo link sent to ${to}`);
}

// ══════════════════════════════════════════════════════════════════
//  sendOrderConfirmation — simple confirmation
// ══════════════════════════════════════════════════════════════════
async function sendOrderConfirmation({ to, guestName, orderId, orderType, price, parkName }) {
  if (!to || !to.includes("@")) return;
  const p = park();
  await transporter.sendMail({
    from:    `${p.name} <${process.env.EMAIL_USER}>`,
    to,
    subject: `✅ Order Confirmed · ${parkName || p.name}`,
    html: `<div style="background:#f0efed;padding:30px;font-family:Arial;">
      <div style="background:#1a1a1a;border-radius:12px;padding:24px;max-width:480px;margin:0 auto;">
        <h2 style="color:#4ade80;margin:0 0 12px;">✅ Order Confirmed!</h2>
        <p style="color:#94a3b8;margin:0 0 16px;">Hi ${guestName}, your order has been placed.</p>
        <table style="color:#f1f5f9;width:100%;">
          <tr><td style="padding:6px 0;color:#475569;">Order ID</td><td style="padding:6px 0;font-family:monospace;">${orderId}</td></tr>
          <tr><td style="padding:6px 0;color:#475569;">Package</td><td style="padding:6px 0;">${typeLabel[orderType] || orderType}</td></tr>
          <tr><td style="padding:6px 0;color:#475569;">Amount</td><td style="padding:6px 0;color:#f59e0b;font-weight:700;">₹${price}</td></tr>
        </table>
      </div>
    </div>`,
  });
}

module.exports = { sendPhotoLink, sendReceiptWithPhoto, sendOrderConfirmation };
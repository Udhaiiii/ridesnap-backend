// src/db/database.js
const Database = require("better-sqlite3");
const path     = require("path");
require("dotenv").config();

const DB_PATH = process.env.DB_PATH || "./ridesnap.db";
const db = new Database(path.resolve(DB_PATH));

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`

  -- Every guest visit
  CREATE TABLE IF NOT EXISTS visits (
    id          TEXT PRIMARY KEY,
    guest_name  TEXT,
    phone       TEXT,
    email       TEXT,
    entry_time  TEXT DEFAULT (datetime('now','localtime')),
    exit_time   TEXT,
    status      TEXT DEFAULT 'active'
  );

  -- Photos taken by photographer
  CREATE TABLE IF NOT EXISTS photos (
    id            TEXT PRIMARY KEY,
    visit_id      TEXT NOT NULL,
    ride_id       TEXT NOT NULL,
    ride_name     TEXT NOT NULL,
    s3_key        TEXT,
    s3_url        TEXT,
    watermark_url TEXT,
    file_size     INTEGER,
    status        TEXT DEFAULT 'pending',
    captured_at   TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (visit_id) REFERENCES visits(id)
  );

  -- Orders placed by guest
  -- ── Migration: Add payment columns if not exist ─────────────
  -- Safe to run multiple times — ALTER TABLE IF NOT EXISTS column
  -- SQLite doesn't support IF NOT EXISTS for columns, so we use a workaround via pragma
  -- These run only if column is missing
  CREATE TABLE IF NOT EXISTS _migrations (id TEXT PRIMARY KEY);

  -- We run these via separate statements in the migration block below

  CREATE TABLE IF NOT EXISTS orders (
    id              TEXT PRIMARY KEY,
    visit_id        TEXT NOT NULL,
    photo_id        TEXT NOT NULL,
    order_type      TEXT NOT NULL,
    price           INTEGER NOT NULL,
    payment_status  TEXT DEFAULT 'pending',  -- pending | paid | partial
    payment_mode    TEXT DEFAULT NULL,        -- cash | upi | card | razorpay | split
    payment_splits  TEXT DEFAULT NULL,        -- JSON: [{"mode":"cash","amount":100},{"mode":"upi","amount":50}]
    delivery_status TEXT DEFAULT 'pending',
    email_sent      INTEGER DEFAULT 0,
    print_queued    INTEGER DEFAULT 0,
    created_at      TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (visit_id) REFERENCES visits(id),
    FOREIGN KEY (photo_id) REFERENCES photos(id)
  );

  -- Print queue
  CREATE TABLE IF NOT EXISTS print_queue (
    id           TEXT PRIMARY KEY,
    order_id     TEXT NOT NULL,
    photo_id     TEXT NOT NULL,
    visit_id     TEXT NOT NULL,
    guest_name   TEXT,
    phone        TEXT,
    print_size   TEXT DEFAULT 'A4',
    copies       INTEGER DEFAULT 1,
    status       TEXT DEFAULT 'queued',
    queued_at    TEXT DEFAULT (datetime('now','localtime')),
    printed_at   TEXT,
    collected_at TEXT,
    FOREIGN KEY (order_id) REFERENCES orders(id)
  );

  -- Rides master list
  CREATE TABLE IF NOT EXISTS rides (
    id    TEXT PRIMARY KEY,
    name  TEXT NOT NULL,
    emoji TEXT
  );

  -- ── NEW: Wristbands table ──────────────────────────────────────
  -- Pre-registered valid wristband IDs
  -- Only IDs in this table are accepted by the system
  CREATE TABLE IF NOT EXISTS wristbands (
    id          TEXT PRIMARY KEY,   -- e.g. WB-0001
    status      TEXT DEFAULT 'inactive', -- inactive | active | used
    batch_date  TEXT,               -- date this batch was generated
    batch_label TEXT,               -- e.g. "Morning Batch - 13 Mar"
    created_at  TEXT DEFAULT (datetime('now','localtime')),
    activated_at TEXT               -- when first photo was linked
  );

  -- ── Short links table ───────────────────────────────────────────
  -- Maps short code → order_id → S3 URL
  -- Used in SMS: yourdomain.com/p/ABC123
  CREATE TABLE IF NOT EXISTS short_links (
    code       TEXT PRIMARY KEY,          -- e.g. ABC123 (6 chars)
    order_id   TEXT NOT NULL,
    photo_id   TEXT NOT NULL,
    visit_id   TEXT NOT NULL,
    expires_at TEXT NOT NULL,             -- 7 days from creation
    clicks     INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now','localtime'))
  );

  -- Seed rides
  INSERT OR IGNORE INTO rides VALUES
    ('R01','Thunder Coaster','🎢'),
    ('R02','Aqua Drop','💧'),
    ('R03','Sky Twister','🌪️'),
    ('R04','Dark Tunnel','🚂'),
    ('R05','Gravity Zone','⚡');

`);

// ── Users table (for role-based login) ───────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id         TEXT PRIMARY KEY,
    username   TEXT UNIQUE NOT NULL,
    password   TEXT NOT NULL,
    role       TEXT NOT NULL,  -- admin | photographer | counter | print
    name       TEXT,
    active     INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now','localtime')),
    last_login TEXT
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token      TEXT PRIMARY KEY,
    user_id    TEXT NOT NULL,
    role       TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now','localtime'))
  );

  -- Default admin account (change password after first login!)
  INSERT OR IGNORE INTO users (id, username, password, role, name)
  VALUES ('USR-ADMIN', 'admin', 'admin@123', 'admin', 'Administrator');
`);

// ── Safe column migrations ─────────────────────────────────────────
// Runs every startup — adds missing columns to existing DB
// Safe to run multiple times, never drops data
const addColIfMissing = (table, col, definition) => {
  try {
    const cols = db.pragma(`table_info(${table})`).map(c => c.name);
    if (!cols.includes(col)) {
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${definition}`);
      console.log(`✅ Migration: added ${table}.${col}`);
    }
  } catch(e) {
    console.warn(`⚠️ Migration warning for ${table}.${col}:`, e.message);
  }
};

// Payment columns (added in v2)
addColIfMissing('orders', 'payment_mode',   'TEXT DEFAULT NULL');
addColIfMissing('orders', 'payment_splits', 'TEXT DEFAULT NULL');

// ── End migrations ─────────────────────────────────────────────────

console.log("✅ Database ready:", path.resolve(DB_PATH));
module.exports = db;
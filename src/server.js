// src/server.js
// RideSnap Backend – Main Entry Point

require("dotenv").config();
const express = require("express");
const cors    = require("cors");
const path    = require("path");

const routes  = require("./routes/index");

const app  = express();
const PORT = process.env.PORT || 5000;

// ── Middleware ────────────────────────────────────────────────────
app.use(cors({
  origin: "*", // In production: restrict to your frontend domain
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

// ── Serve static files (for local testing without S3) ─────────────
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// ── API Routes ────────────────────────────────────────────────────
app.use("/api", routes);

// ── Short link redirect  /p/:code ────────────────────────────────
// Must be outside /api so the URL stays clean: yoursite.com/p/ABC123
app.use("/p", routes);

// ── Static pages ─────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, "../public")));

// ── 404 handler ───────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, error: `Route ${req.method} ${req.path} not found` });
});

// ── Global error handler ──────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error("❌ Server error:", err.message);
  res.status(500).json({ success: false, error: err.message });
});

// ── Start ─────────────────────────────────────────────────────────
app.listen(PORT, "0.0.0.0", () => {
  console.log(`
  ╔══════════════════════════════════════════╗
  ║   📸 RideSnap Backend Running            ║
  ║   http://localhost:${PORT}                  ║
  ║                                          ║
  ║   Endpoints:                             ║
  ║   POST  /api/visits          (check-in)  ║
  ║   GET   /api/visits/:id      (by QR)     ║
  ║   POST  /api/photos/upload   (upload)    ║
  ║   POST  /api/orders          (buy photo) ║
  ║   GET   /api/print-queue     (prints)    ║
  ║   GET   /api/stats           (dashboard) ║
  ║   GET   /api/health          (ping)      ║
  ╚══════════════════════════════════════════╝
  `);
});

module.exports = app;
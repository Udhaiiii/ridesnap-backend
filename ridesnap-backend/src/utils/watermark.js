// src/utils/watermark.js
// Watermark removed — photos uploaded as originals
// Guest pays first, then receives original via email/WhatsApp

const sharp = require("sharp");

// ── Get image metadata ────────────────────────────────────────────
async function getImageMeta(inputBuffer) {
  const meta = await sharp(inputBuffer).metadata();
  return {
    width:  meta.width,
    height: meta.height,
    format: meta.format,
    size:   inputBuffer.length,
  };
}

module.exports = { getImageMeta };
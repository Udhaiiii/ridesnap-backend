// src/utils/printer.js
// Zebra ZPL wristband printer utility
// Sends ZPL commands directly to USB-connected Zebra printer

const { exec } = require("child_process");
const fs        = require("fs");
const path      = require("path");
const os        = require("os");

require("dotenv").config();

const PRINTER_NAME = process.env.PRINTER_NAME || "ZDesigner ZD621-203dpi ZPL";
const DPI          = parseInt(process.env.PRINTER_DPI) || 203;
const PARK_NAME    = process.env.PARK_PRINT_NAME     || "Wonderla";
const PARK_SUB     = process.env.PARK_PRINT_SUBTITLE || "Parks and Resorts";

// ── ZPL dimensions at 203 DPI ────────────────────────────────────
// 6 inch wide × 1 inch tall
const W = Math.round(6 * DPI);   // 1218 dots
const H = Math.round(1 * DPI);   // 203 dots

// ── Sample Logo in ZPL (text-based, no image needed) ─────────────
// Zebra thermal = black only, so we use bold text as logo
function buildLogoZPL() {
  return [
    // Large bold W as logo icon
    `^FO12,8^A0N,52,48^FDW^FS`,
    // Underline
    `^FO12,62^GB48,3,3^FS`,
  ].join("\n");
}

// ── Generate ZPL for one wristband ───────────────────────────────
function generateWristbandZPL(wbId, date) {
  const dateStr = date ||
    new Date().toLocaleDateString("en-IN", {
      day: "2-digit", month: "short", year: "numeric"
    });

  // QR content = just the wristband ID
  const qrContent = wbId;

  return `
^XA
^PW${W}
^LL${H}
^MNW
^MTD
^PON
^LH0,0

${buildLogoZPL()}

^FO68,6^A0N,26,26^FD${PARK_NAME}^FS
^FO68,36^A0N,18,18^FD${PARK_SUB}^FS
^FO68,58^GB160,2,2^FS
^FO68,68^A0N,18,18^FDRIDE PHOTO PASS^FS

^FO265,8^BQN,2,5^FD${qrContent}^FS

^FO490,10^A0N,36,36^FD${wbId}^FS
^FO490,55^A0N,20,20^FD${dateStr}^FS
^FO490,82^A0N,16,16^FDValid Today Only^FS

^FO480,8^GB2,185,2^FS

^XZ
`.trim();
}

// ── Send ZPL to printer ───────────────────────────────────────────
// On Windows: writes ZPL to temp file → sends via COPY command
function sendZPL(zplString) {
  return new Promise((resolve, reject) => {
    const tmpFile = path.join(os.tmpdir(), `ridesnap_${Date.now()}.zpl`);

    try {
      fs.writeFileSync(tmpFile, zplString, "binary");

      // Windows COPY command sends raw bytes to printer port
      const cmd = `COPY /B "${tmpFile}" "${PRINTER_NAME}"`;

      exec(cmd, { shell: "cmd.exe" }, (error, stdout, stderr) => {
        // Clean up temp file
        try { fs.unlinkSync(tmpFile); } catch(e) {}

        if (error) {
          console.error(`❌ Print error: ${error.message}`);
          reject(new Error(`Print failed: ${error.message}`));
        } else {
          console.log(`✅ Printed: sent to ${PRINTER_NAME}`);
          resolve({ success: true });
        }
      });

    } catch(err) {
      try { fs.unlinkSync(tmpFile); } catch(e) {}
      reject(err);
    }
  });
}

// ── Print multiple wristbands ─────────────────────────────────────
async function printWristbands(ids, date) {
  const results = [];

  for (const id of ids) {
    try {
      const zpl = generateWristbandZPL(id, date);
      await sendZPL(zpl);
      results.push({ id, success: true });
      // Small delay between bands
      await new Promise(r => setTimeout(r, 200));
    } catch(err) {
      results.push({ id, success: false, error: err.message });
    }
  }

  return results;
}

// ── Preview ZPL (for debugging) ───────────────────────────────────
function previewZPL(wbId, date) {
  return generateWristbandZPL(wbId, date);
}

module.exports = { printWristbands, generateWristbandZPL, previewZPL, sendZPL };
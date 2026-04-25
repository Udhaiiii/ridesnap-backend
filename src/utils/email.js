// src/utils/email.js
// Sends photo download link to guest email after payment

const nodemailer = require("nodemailer");
require("dotenv").config();

// Create transporter (Gmail)
// For other providers change host/port
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // Gmail App Password
  },
});

// ── Send photo download link to guest ────────────────────────────
async function sendPhotoLink({ to, guestName, photoUrl, orderId, rideName, parkName }) {
  const subject = `📸 Your ${parkName} Ride Photo is Ready!`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8"/>
      <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    </head>
    <body style="margin:0;padding:0;background:#0a0f1e;font-family:Arial,sans-serif;">
      <div style="max-width:500px;margin:0 auto;padding:30px 20px;">

        <!-- Header -->
        <div style="text-align:center;margin-bottom:28px;">
          <div style="font-size:42px;">📸</div>
          <h1 style="color:#facc15;font-size:22px;margin:8px 0;">${parkName}</h1>
          <p style="color:#64748b;font-size:13px;letter-spacing:2px;">YOUR RIDE PHOTO IS READY</p>
        </div>

        <!-- Main card -->
        <div style="background:#0d1829;border:1px solid #1e293b;border-radius:16px;padding:24px;margin-bottom:20px;">
          <p style="color:#94a3b8;font-size:14px;margin-bottom:4px;">Hi ${guestName || "Adventure Seeker"} 👋</p>
          <p style="color:#f1f5f9;font-size:15px;line-height:1.7;margin-bottom:20px;">
            Your photo from <strong style="color:#facc15;">${rideName}</strong> is ready to download!
            Click the button below to save your memory forever. 🎢
          </p>

          <!-- Download button -->
          <div style="text-align:center;margin:24px 0;">
            <a href="${photoUrl}"
               style="display:inline-block;background:#facc15;color:#0f172a;
                      padding:14px 36px;border-radius:12px;text-decoration:none;
                      font-weight:bold;font-size:16px;letter-spacing:1px;">
              ⬇️ Download Full Photo
            </a>
          </div>

          <p style="color:#475569;font-size:11px;text-align:center;margin-top:16px;">
            This link is valid for 7 days · Order ID: ${orderId}
          </p>
        </div>

        <!-- Footer -->
        <div style="text-align:center;">
          <p style="color:#334155;font-size:11px;line-height:1.8;">
            Thank you for visiting ${parkName}!<br/>
            Share your photo and tag us 🎉
          </p>
        </div>

      </div>
    </body>
    </html>
  `;

  await transporter.sendMail({
    from:    process.env.EMAIL_FROM,
    to,
    subject,
    html,
  });

  console.log(`📧 Photo link sent to ${to}`);
}

// ── Send order confirmation ───────────────────────────────────────
async function sendOrderConfirmation({ to, guestName, orderId, orderType, price, parkName }) {
  const typeLabel = { digital:"Digital Download", print:"Print Copy", frame:"Framed Print", combo:"Combo Pack" };

  await transporter.sendMail({
    from:    process.env.EMAIL_FROM,
    to,
    subject: `✅ Order Confirmed · ${parkName}`,
    html: `
      <div style="background:#0a0f1e;padding:30px;font-family:Arial;">
        <h2 style="color:#4ade80;">Order Confirmed! ✅</h2>
        <p style="color:#94a3b8;">Hi ${guestName}, your order has been placed.</p>
        <table style="color:#f1f5f9;margin-top:16px;">
          <tr><td style="padding:6px 0;color:#475569;">Order ID</td><td style="padding:6px 16px;">${orderId}</td></tr>
          <tr><td style="padding:6px 0;color:#475569;">Type</td><td style="padding:6px 16px;">${typeLabel[orderType]}</td></tr>
          <tr><td style="padding:6px 0;color:#475569;">Amount</td><td style="padding:6px 16px;color:#facc15;">₹${price}</td></tr>
        </table>
        <p style="color:#475569;margin-top:20px;font-size:12px;">
          ${orderType === "digital" ? "Your download link will arrive shortly." : "Please collect your print at the Photo Counter."}
        </p>
      </div>
    `,
  });
}

module.exports = { sendPhotoLink, sendOrderConfirmation };
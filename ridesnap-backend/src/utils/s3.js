// src/utils/s3.js
require("dotenv").config({ path: require("path").resolve(__dirname, "../../.env") });

const AWS = require("aws-sdk");

// Debug: print what we loaded (remove after testing)
console.log("🔑 AWS Key loaded:", process.env.AWS_ACCESS_KEY_ID ? "YES ✅" : "NO ❌");
console.log("🪣 Bucket:", process.env.S3_BUCKET_NAME || process.env.AWS_BUCKET);

AWS.config.update({
  accessKeyId:     process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_KEY || process.env.AWS_SECRET_ACCESS_KEY,
  region:          process.env.AWS_REGION || "ap-south-1",
});

const s3     = new AWS.S3();
const BUCKET = process.env.S3_BUCKET_NAME || process.env.AWS_BUCKET || "wonderla-source-code";
const FOLDER = process.env.S3_FOLDER      || process.env.AWS_FOLDER || "digital2";

// ── Upload buffer to S3 ───────────────────────────────────────────
async function uploadToS3(buffer, key, contentType = "image/jpeg") {
  const params = {
    Bucket:      BUCKET,
    Key:         key,
    Body:        buffer,
    ContentType: contentType,
  };
  const result = await s3.upload(params).promise();
  return result.Location;
}

// ── Presigned upload URL (phone → S3 direct) ─────────────────────
function getPresignedUploadUrl(key, contentType = "image/jpeg") {
  return s3.getSignedUrlPromise("putObject", {
    Bucket:      BUCKET,
    Key:         key,
    ContentType: contentType,
    Expires:     300,
  });
}

// ── Presigned read URL (private photo download) ───────────────────
function getPresignedReadUrl(key, expiresInSeconds = 604800) {
  return s3.getSignedUrlPromise("getObject", {
    Bucket:  BUCKET,
    Key:     key,
    Expires: expiresInSeconds,
  });
}

// ── Delete from S3 ────────────────────────────────────────────────
async function deleteFromS3(key) {
  await s3.deleteObject({ Bucket: BUCKET, Key: key }).promise();
}

// ── Build S3 key path ─────────────────────────────────────────────
function buildS3Key(rideId, visitId, photoId, type = "original") {
  const date = new Date().toISOString().slice(0, 10);
  return `${FOLDER}/rides/${rideId}/${date}/${visitId}/${photoId}_${type}.jpg`;
}

module.exports = { uploadToS3, getPresignedUploadUrl, getPresignedReadUrl, deleteFromS3, buildS3Key };
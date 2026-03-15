// middleware/uploadReviewMedia.js
const path = require("path");
const fs = require("fs");
const multer = require("multer");

// ensure directories exist
const IMG_DIR = path.join(__dirname, "..", "public", "reviews", "img");
const VID_DIR = path.join(__dirname, "..", "public", "reviews", "vid");
[IMG_DIR, VID_DIR].forEach(dir => { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); });

// storage chooses destination based on file mimetype
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, IMG_DIR);
    else if (file.mimetype.startsWith("video/")) cb(null, VID_DIR);
    else cb(new Error("Unsupported file type"), null);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const base = Date.now() + "-" + Math.random().toString(36).slice(2, 8);
    cb(null, `${base}${ext}`);
  }
});

// accept up to 3 images and 1 video per review as an example
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max per file
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) return cb(null, true);
    if (file.mimetype.startsWith("video/")) return cb(null, true);
    return cb(null, false);
  }
});

module.exports = upload;
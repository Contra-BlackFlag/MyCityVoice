const multer = require("multer");
const path = require("path");
const fs = require("fs");
const UPLOAD_DIR = path.join(__dirname, "../uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => cb(null, `img-${Date.now()}-${Math.random().toString(36).slice(2)}${path.extname(file.originalname).toLowerCase()}`),
});
const fileFilter = (req, file, cb) => {
  ["image/jpeg","image/jpg","image/png","image/webp"].includes(file.mimetype) ? cb(null,true) : cb(new Error("Images only"),false);
};
module.exports = multer({ storage, fileFilter, limits: { fileSize: 10*1024*1024 } });

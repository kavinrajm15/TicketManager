const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    // Sanitize original name: replace spaces/special chars
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}-${safe}`);
  },
});

const ALLOWED_EXTS = /\.(jpg|jpeg|png|gif|pdf|doc|docx|xls|xlsx|txt|csv|zip|rar|mp4|mp3)$/i;

const fileFilter = (_req, file, cb) => {
  if (ALLOWED_EXTS.test(path.extname(file.originalname))) {
    cb(null, true);
  } else {
    cb(new Error('File type not allowed. Supported: images, PDF, Office docs, archives.'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB max
});

module.exports = upload;

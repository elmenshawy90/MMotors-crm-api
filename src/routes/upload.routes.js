import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authenticate } from '../middleware/auth.middleware.js';
import logger from '../utils/logger.js';

const router = express.Router();
router.use(authenticate);

// ── Storage config ─────────────────────────────────────────────────────────
// /var/task is read-only on Lambda — only /tmp is writable.
// UPLOAD_PATH env overrides; default to /tmp on Lambda, ./uploads elsewhere.
const UPLOAD_DIR = process.env.UPLOAD_PATH
  ? path.resolve(process.env.UPLOAD_PATH, 'knowledge')
  : process.env.AWS_LAMBDA_FUNCTION_NAME
    ? '/tmp/uploads/knowledge'
    : path.resolve('uploads/knowledge');

let uploadReady = false;
try {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  fs.accessSync(UPLOAD_DIR, fs.constants.W_OK);
  uploadReady = true;
} catch (err) {
  logger.warn(`Upload directory not writable (${UPLOAD_DIR}), file uploads will fail: ${err.message}`);
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext  = path.extname(file.originalname).toLowerCase();
    const base = path.basename(file.originalname, ext)
      .replace(/[^a-z0-9_\-]/gi, '_')
      .slice(0, 60);
    cb(null, `${Date.now()}_${base}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.png', '.jpg', '.jpeg'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`File type not allowed: ${ext}`));
    }
  },
});

// POST /api/upload/knowledge  →  { url, filename, size, mimetype }
router.post('/knowledge', (req, res, next) => {
  if (!uploadReady) {
    return res.status(503).json({ success: false, message: 'File uploads are not available on this instance' });
  }
  next();
}, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }
  const fileUrl = `/uploads/knowledge/${req.file.filename}`;
  logger.info(`File uploaded: ${req.file.filename} by user ${req.user.id}`);
  res.json({
    success: true,
    data: {
      url:      fileUrl,
      filename: req.file.originalname,
      size:     req.file.size,
      mimetype: req.file.mimetype,
    },
  });
});

export default router;

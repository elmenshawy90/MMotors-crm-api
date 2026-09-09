import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authenticate } from '../middleware/auth.middleware.js';
import logger from '../utils/logger.js';

const router = express.Router();
router.use(authenticate);

// ── Storage config ─────────────────────────────────────────────────────────
const UPLOAD_DIR = path.resolve('uploads/knowledge');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

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
router.post('/knowledge', upload.single('file'), (req, res) => {
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

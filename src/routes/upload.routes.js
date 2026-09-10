import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

import { authenticate } from '../middleware/auth.middleware.js';
import logger from '../utils/logger.js';

const router = express.Router();


// Authentication


router.use(authenticate);


// Upload Configuration


const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

const ALLOWED_FILES = new Map([
  ['.pdf',  ['application/pdf']],
  ['.doc',  ['application/msword']],
  ['.docx', ['application/vnd.openxmlformats-officedocument.wordprocessingml.document']],
  ['.xls',  ['application/vnd.ms-excel']],
  ['.xlsx', ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']],
  ['.png',  ['image/png']],
  ['.jpg',  ['image/jpeg']],
  ['.jpeg', ['image/jpeg']],
]);

/*
 * Upload directory:
 */

const BASE_UPLOAD_PATH = process.env.UPLOAD_PATH
  ? path.resolve(process.env.UPLOAD_PATH)
  : process.env.AWS_LAMBDA_FUNCTION_NAME
    ? '/tmp/uploads'
    : path.resolve('uploads');

const UPLOAD_DIR = path.join(BASE_UPLOAD_PATH, 'knowledge');


// Prepare Upload Directory


let uploadReady = false;

try {
  fs.mkdirSync(UPLOAD_DIR, {
    recursive: true,
    mode: 0o750,
  });

  fs.accessSync(UPLOAD_DIR, fs.constants.W_OK);

  uploadReady = true;

  logger.info(`Upload directory ready: ${UPLOAD_DIR}`);
} catch (error) {
  logger.error(
    `Upload directory is not writable: ${UPLOAD_DIR}`,
    {
      error: error.message,
    }
  );
}


// Filename Sanitization


function sanitizeFilename(originalName) {
  const ext = path.extname(originalName).toLowerCase();

  let base = path.basename(originalName, ext);

  // Remove dangerous characters
  base = base
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/-+/g, '-')
    .replace(/^[-_.]+|[-_.]+$/g, '')
    .slice(0, 60);

  if (!base) {
    base = 'file';
  }

  return {
    base,
    ext,
  };
}


// Multer Storage


const storage = multer.diskStorage({

  destination: (_req, _file, callback) => {
    callback(null, UPLOAD_DIR);
  },

  filename: (_req, file, callback) => {

    const { base, ext } = sanitizeFilename(file.originalname);

    

    const randomId = crypto.randomBytes(8).toString('hex');

    const date = new Date()
      .toISOString()
      .slice(0, 10)
      .replace(/-/g, '');

    const filename = `${date}_${randomId}_${base}${ext}`;

    callback(null, filename);
  },
});


// File Validation


function fileFilter(_req, file, callback) {

  const { ext } = sanitizeFilename(file.originalname);

  const allowedMimeTypes = ALLOWED_FILES.get(ext);

  // Extension not allowed
  if (!allowedMimeTypes) {
    return callback(
      new multer.MulterError('LIMIT_UNEXPECTED_FILE')
    );
  }

  // MIME type does not match extension
  if (!allowedMimeTypes.includes(file.mimetype)) {
    logger.warn(
      `Rejected file with invalid MIME type: ${file.originalname}`
    );

    return callback(
      new Error('File MIME type does not match the file extension')
    );
  }

  callback(null, true);
}


// Multer Upload Middleware

const upload = multer({

  storage,

  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
    fields: 20,
  },

  fileFilter,
});


// POST /api/upload/knowledge


router.post(
  '/knowledge',

  // Check upload directory before processing request
  (_req, res, next) => {

    if (!uploadReady) {
      return res.status(503).json({
        success: false,
        message: 'File uploads are temporarily unavailable',
      });
    }

    next();
  },

  // Multer
  (req, res, next) => {

    upload.single('file')(req, res, (error) => {

      if (!error) {
        return next();
      }

      if (error instanceof multer.MulterError) {

        if (error.code === 'LIMIT_FILE_SIZE') {
          return res.status(413).json({
            success: false,
            message: 'File size exceeds the maximum limit of 20 MB',
          });
        }

        if (error.code === 'LIMIT_UNEXPECTED_FILE') {
          return res.status(400).json({
            success: false,
            message: 'File type is not allowed',
          });
        }

        return res.status(400).json({
          success: false,
          message: 'File upload failed',
        });
      }

      logger.warn(`File upload rejected: ${error.message}`);

      return res.status(400).json({
        success: false,
        message: error.message || 'Invalid file upload',
      });
    });
  },

  // ========================================================================
  // Response
  // ========================================================================

  async (req, res) => {

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded',
      });
    }

    try {

      const fileUrl = `/uploads/knowledge/${encodeURIComponent(
        req.file.filename
      )}`;

      logger.info('Knowledge file uploaded', {
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
        userId: req.user?.id,
      });

      return res.status(201).json({
        success: true,

        data: {
          url: fileUrl,
          filename: req.file.originalname,
          storedFilename: req.file.filename,
          size: req.file.size,
          mimetype: req.file.mimetype,
        },
      });

    } catch (error) {

      /*
       * If something fails after Multer has written the file,
       * remove the physical file so we don't leave orphan files.
       */

      try {
        if (req.file?.path && fs.existsSync(req.file.path)) {
          await fs.promises.unlink(req.file.path);
        }
      } catch (cleanupError) {
        logger.error('Failed to cleanup uploaded file', {
          error: cleanupError.message,
          file: req.file?.path,
        });
      }

      logger.error('Failed to process uploaded file', {
        error: error.message,
        userId: req.user?.id,
      });

      return res.status(500).json({
        success: false,
        message: 'Failed to process uploaded file',
      });
    }
  }
);


// Export


export default router;


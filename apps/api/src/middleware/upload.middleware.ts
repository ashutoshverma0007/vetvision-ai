import multer from 'multer';
import { BadRequestError } from '../errors.js';

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 Megabytes

const storage = multer.memoryStorage();

export const uploadSingleImage = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
    files: 1
  },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype.toLowerCase())) {
      return cb(
        new BadRequestError(
          `Invalid file format: ${file.mimetype}. Only JPEG, PNG, and WEBP image formats are permitted.`
        )
      );
    }
    cb(null, true);
  }
}).single('file');

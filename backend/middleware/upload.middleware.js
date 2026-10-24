import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const tempUploadDir = path.join(__dirname, '../uploads/temp');

// Ensure temporary upload directory exists
if (!fs.existsSync(tempUploadDir)) {
  fs.mkdirSync(tempUploadDir, { recursive: true });
}

// Temporary storage - files will be validated and moved to user/purchase folders in service
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, tempUploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeFieldName = file.fieldname === 'jewelleryPhoto' || file.fieldname === 'jewellery_image' 
      ? 'jewellery' 
      : 'invoice';
    const uniqueSuffix = Date.now() + '_' + Math.random().toString(36).substring(2, 9);
    cb(null, `${safeFieldName}_${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif', '.jfif'];
  const allowedMimeTypes = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/jpg',
    'image/heic',
    'image/heif',
    'image/jfif',
    'image/pjpeg',
    'image/x-png',
    'application/octet-stream',
  ];

  const ext = path.extname(file.originalname).toLowerCase();
  const isExtAllowed = allowedExtensions.includes(ext);
  const isMimeAllowed = allowedMimeTypes.includes(file.mimetype) || (file.mimetype && file.mimetype.startsWith('image/'));

  if (isExtAllowed || isMimeAllowed) {
    return cb(null, true);
  }

  const err = new Error(
    `Unsupported file type for "${file.originalname}". Only PDF and image files (JPG, PNG, WEBP) are permitted.`
  );
  err.statusCode = 400;
  return cb(err, false);
};

export const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB maximum
  },
  fileFilter,
});

export default upload;

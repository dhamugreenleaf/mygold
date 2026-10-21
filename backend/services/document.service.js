import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { PurchaseDocument } from '../models/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const baseUploadsDir = path.join(__dirname, '../uploads');

/**
 * Move a staged file from temp upload folder to secure user/purchase folder
 */
export const storePurchaseDocument = async (userId, purchaseId, file, documentType, transaction = null) => {
  const typeFolder = documentType === 'INVOICE' ? 'invoice' : 'jewellery';
  const targetDir = path.join(baseUploadsDir, 'users', String(userId), 'purchases', String(purchaseId), typeFolder);

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const ext = path.extname(file.originalname).toLowerCase();
  const safeStoredName = `${typeFolder}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`;
  const targetPath = path.join(targetDir, safeStoredName);

  // Move file from temp to final destination
  fs.renameSync(file.path, targetPath);

  const relativePath = path.relative(baseUploadsDir, targetPath).replace(/\\/g, '/');

  const doc = await PurchaseDocument.create(
    {
      purchase_id: purchaseId,
      user_id: userId,
      document_type: documentType,
      original_name: file.originalname,
      stored_name: safeStoredName,
      mime_type: file.mimetype,
      file_size: file.size,
      file_path: relativePath,
    },
    { transaction }
  );

  return doc;
};

/**
 * Remove all files and directories associated with a purchase
 */
export const removePurchaseFilesFromDisk = (userId, purchaseId) => {
  try {
    const purchaseFolder = path.join(baseUploadsDir, 'users', String(userId), 'purchases', String(purchaseId));
    if (fs.existsSync(purchaseFolder)) {
      fs.rmSync(purchaseFolder, { recursive: true, force: true });
    }
  } catch (err) {
    console.error('Error removing purchase directory:', err.message);
  }
};

/**
 * Retrieve document metadata and verify file exists for authenticated streaming
 */
export const getDocumentForUser = async (userId, purchaseId, documentType) => {
  const document = await PurchaseDocument.findOne({
    where: {
      user_id: userId,
      purchase_id: purchaseId,
      document_type: documentType,
    },
  });

  if (!document) {
    return null;
  }

  const absolutePath = path.join(baseUploadsDir, document.file_path);
  if (!fs.existsSync(absolutePath)) {
    return null;
  }

  return {
    document,
    absolutePath,
  };
};

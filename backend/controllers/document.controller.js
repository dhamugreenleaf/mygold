import path from 'path';
import { getDocumentForUser } from '../services/document.service.js';

export const getInvoice = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const purchaseId = req.params.id;
    const isDownload = req.query.download === 'true';

    const result = await getDocumentForUser(userId, purchaseId, 'INVOICE');
    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Invoice document not found or currently unavailable.',
      });
    }

    res.setHeader('Content-Type', result.document.mime_type || 'application/pdf');
    const dispositionType = isDownload ? 'attachment' : 'inline';
    res.setHeader(
      'Content-Disposition',
      `${dispositionType}; filename="${encodeURIComponent(result.document.original_name)}"`
    );

    return res.sendFile(result.absolutePath);
  } catch (error) {
    next(error);
  }
};

export const getJewelleryPhoto = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const purchaseId = req.params.id;
    const isDownload = req.query.download === 'true';

    const result = await getDocumentForUser(userId, purchaseId, 'JEWELLERY_PHOTO');
    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Jewellery photo not found or currently unavailable.',
      });
    }

    res.setHeader('Content-Type', result.document.mime_type || 'image/jpeg');
    const dispositionType = isDownload ? 'attachment' : 'inline';
    res.setHeader(
      'Content-Disposition',
      `${dispositionType}; filename="${encodeURIComponent(result.document.original_name)}"`
    );

    return res.sendFile(result.absolutePath);
  } catch (error) {
    next(error);
  }
};

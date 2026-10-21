import React, { useEffect, useState } from 'react';
import { 
  FiX, 
  FiExternalLink, 
  FiDownload, 
  FiAlertCircle, 
  FiRefreshCw, 
  FiFileText, 
  FiImage 
} from 'react-icons/fi';
import { fetchSecureDocumentBlob } from '../../services/api';

export const DocumentModal = ({
  isOpen,
  onClose,
  title,
  subtitle,
  fileUrl,
  originalFileName,
  type = 'image', // 'image' | 'pdf'
}) => {
  const [blobUrl, setBlobUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load document binary securely with Authorization header
  const loadDocument = () => {
    if (!fileUrl) return;

    setLoading(true);
    setError(null);

    // If already a local blob/data URL, use directly
    if (fileUrl.startsWith('blob:') || fileUrl.startsWith('data:')) {
      setBlobUrl(fileUrl);
      setLoading(false);
      return;
    }

    fetchSecureDocumentBlob(fileUrl)
      .then(({ blobUrl: generatedUrl }) => {
        setBlobUrl(generatedUrl);
      })
      .catch((err) => {
        console.error('Failed to load protected document:', err);
        const status = err.response?.status;
        if (status === 404) {
          setError('This document is currently unavailable.');
        } else {
          setError('Unable to open this document.');
        }
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    if (isOpen && fileUrl) {
      loadDocument();
    } else {
      setBlobUrl(null);
      setError(null);
    }

    return () => {
      if (blobUrl && blobUrl.startsWith('blob:')) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [isOpen, fileUrl]);

  // Handle Escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !fileUrl) return null;

  const isPdf =
    type === 'pdf' ||
    (originalFileName && originalFileName.toLowerCase().endsWith('.pdf')) ||
    fileUrl.toLowerCase().includes('.pdf');

  const token = localStorage.getItem('aurum_token');
  const getApiRoot = () => {
    if (!import.meta.env.DEV && import.meta.env.VITE_API_BASE_URL) {
      return import.meta.env.VITE_API_BASE_URL.replace(/\/api\/?$/, '');
    }

    if (import.meta.env.DEV) {
      if (
        typeof window !== 'undefined' &&
        window.location.hostname &&
        window.location.hostname !== 'localhost' &&
        window.location.hostname !== '127.0.0.1' &&
        /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(window.location.hostname)
      ) {
        return `http://${window.location.hostname}:5010`;
      }
      return (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5010/api').replace(/\/api\/?$/, '');
    }

    // Production: use current domain origin or production domain fallback
    if (typeof window !== 'undefined' && window.location.origin) {
      return window.location.origin;
    }
    return 'https://mygold.greenleafagencies.com';
  };
  const apiRoot = getApiRoot();

  const normalizedPath = fileUrl.startsWith('/') ? fileUrl : `/${fileUrl}`;
  const directPath = normalizedPath.startsWith('/api/') ? normalizedPath : `/api${normalizedPath}`;
  const directTabUrl = `${apiRoot}${directPath}${directPath.includes('?') ? '&' : '?'}token=${token}`;
  const downloadUrl = `${apiRoot}${directPath}${directPath.includes('?') ? '&' : '?'}download=true&token=${token}`;

  const isInvoice = isPdf || (title && title.toLowerCase().includes('invoice'));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/60 dark:bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="doc-modal-title"
    >
      <div
        className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-200 dark:border-amber-500/25 flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 sm:px-7 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-700 dark:text-amber-300 flex items-center justify-center border border-amber-500/30 shrink-0">
              {isInvoice ? <FiFileText className="w-5 h-5" /> : <FiImage className="w-5 h-5" />}
            </div>
            <div className="min-w-0">
              <h3
                id="doc-modal-title"
                className="font-black text-base sm:text-lg text-slate-900 dark:text-white font-heading truncate"
              >
                {title || (isInvoice ? 'Tax Invoice / Bill' : 'Jewellery Photo')}
              </h3>
              {subtitle && (
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close document viewer"
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer shrink-0 ml-2"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content Body */}
        <div className="p-4 sm:p-6 overflow-auto flex-1 flex items-center justify-center bg-slate-50/50 dark:bg-slate-950/40 min-h-[300px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-12">
              <div className="w-11 h-11 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin"></div>
              <p className="text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-400 font-heading">
                {isInvoice ? 'Loading invoice...' : 'Loading photo...'}
              </p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center text-center gap-3 p-8 max-w-sm">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center border border-rose-500/30">
                <FiAlertCircle className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-bold text-rose-600 dark:text-rose-400">{error}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Please try again or ensure your session is active.</p>
              </div>
              <button
                type="button"
                onClick={loadDocument}
                className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-700 dark:text-amber-300 rounded-xl text-xs font-bold font-heading border border-amber-500/40 transition-all cursor-pointer"
              >
                <FiRefreshCw className="w-3.5 h-3.5" />
                <span>Try Again</span>
              </button>
            </div>
          ) : isPdf ? (
            <div className="w-full h-[58vh] sm:h-[62vh] flex flex-col items-center justify-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
              <iframe
                src={blobUrl}
                title={title || 'Invoice PDF Preview'}
                className="w-full h-full rounded-2xl border-0"
              />
            </div>
          ) : (
            <div className="relative max-h-[65vh] flex items-center justify-center overflow-hidden rounded-2xl bg-slate-100 dark:bg-slate-950/80 p-2 border border-slate-200 dark:border-slate-800 shadow-xs">
              <img
                src={blobUrl}
                alt={title || 'Gold Asset Photo'}
                className="max-h-[60vh] max-w-full w-auto object-contain rounded-xl shadow-md"
              />
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="flex items-center justify-between px-5 sm:px-7 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70 gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            {/* Open in New Tab Button (for Invoices & Photos) */}
            {blobUrl && (
              <a
                href={directTabUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/80 hover:bg-amber-500/15 hover:text-amber-800 dark:hover:text-amber-300 border border-slate-200 dark:border-slate-700 transition-all font-heading"
              >
                <FiExternalLink className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>Open in New Tab</span>
              </a>
            )}

            {/* Download Button */}
            {blobUrl && (
              <a
                href={downloadUrl}
                download={originalFileName || (isPdf ? 'invoice.pdf' : 'jewellery_photo.jpg')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-amber-800 dark:text-amber-300 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 transition-all font-heading"
              >
                <FiDownload className="w-3.5 h-3.5" />
                <span>{isPdf ? 'Download Invoice' : 'Download Photo'}</span>
              </a>
            )}
          </div>

          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer font-heading ml-auto border border-slate-200 dark:border-slate-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default DocumentModal;

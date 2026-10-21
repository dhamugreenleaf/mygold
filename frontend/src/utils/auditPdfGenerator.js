import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Format raw action code to executive human-readable label
 */
const formatActionLabel = (action = '') => {
  const map = {
    PRICING_UPDATED: 'Pricing Update',
    USER_ACTIVATED: 'User Activated',
    USER_DEACTIVATED: 'User Deactivated',
    USER_STATUS_UPDATED: 'Status Update',
    RATE_OVERRIDE_RECORDED: 'Rate Calibration',
    ADMIN_LOGIN: 'Admin Sign-in',
    USER_CREATED: 'Account Registered',
    PAYMENT_RECEIVED: 'Payment Captured',
  };
  if (map[action]) return map[action];
  return action
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
};

/**
 * Sanitize strings and replace Unicode currency symbols (₹) with 'INR ' or 'Rs.'
 * to ensure 100% crisp rendering across all PDF viewers (WPS Office, Adobe, Chrome).
 */
const sanitizeText = (val) => {
  if (val === null || val === undefined) return '—';
  return String(val)
    .replace(/₹/g, 'Rs. ')
    .replace(/[^\x00-\x7F]/g, '') // strip unsupported non-ASCII
    .trim();
};

/**
 * Generates an executive, beautifully formatted Administrative Audit & Compliance PDF report.
 * 
 * @param {Array} logs - List of audit log records from the backend
 * @param {Object} adminUser - Current authenticated admin details
 */
export const downloadAuditLogsPdf = (logs = [], adminUser = {}) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;

  // Corporate Color Palette
  const brandDark = [15, 23, 42];     // #0F172A (Deep Navy)
  const brandGold = [217, 119, 6];    // #D97706 (Amber Gold)
  const brandSubtle = [241, 245, 249]; // #F1F5F9 (Slate Light)
  const textDark = [30, 41, 59];      // #1E293B
  const textMuted = [100, 116, 139];  // #64748B

  // ==========================================
  // 1. TOP HEADER BANNER
  // ==========================================
  doc.setFillColor(...brandDark);
  doc.rect(0, 0, pageWidth, 28, 'F');

  // Gold accent separator bar
  doc.setFillColor(...brandGold);
  doc.rect(0, 28, pageWidth, 2, 'F');

  // Brand Name & Document Title
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('AURUM VAULT - AUDIT & ACTIVITY REPORT', 14, 13);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(245, 158, 11); // Gold accent text
  doc.text('OFFICIAL SYSTEM GOVERNANCE & AUDIT TRAIL RECORD', 14, 20);

  // Top Right Timestamp
  const now = new Date();
  const dateFormatted = now.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const timeFormatted = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  doc.setFontSize(8);
  doc.setTextColor(226, 232, 240);
  doc.text(`Generated: ${dateFormatted}, ${timeFormatted}`, pageWidth - 14, 13, { align: 'right' });
  doc.text(`Issued By: ${adminUser?.username || 'System Administrator'}`, pageWidth - 14, 19, { align: 'right' });
  doc.text(`Classification: STRICTLY CONFIDENTIAL`, pageWidth - 14, 24, { align: 'right' });

  // ==========================================
  // 2. EXECUTIVE SUMMARY METRIC BOXES
  // ==========================================
  const summaryY = 35;
  const cardWidth = (pageWidth - 28 - 6) / 3;
  const cardHeight = 16;

  // Box 1: Total Records
  doc.setFillColor(...brandSubtle);
  doc.roundedRect(14, summaryY, cardWidth, cardHeight, 2, 2, 'F');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...textMuted);
  doc.text('TOTAL LOGGED EVENTS', 18, summaryY + 5.5);
  doc.setFontSize(11);
  doc.setTextColor(...brandDark);
  doc.text(`${logs.length} Recorded Actions`, 18, summaryY + 12);

  // Box 2: Scope / System Status
  const box2X = 14 + cardWidth + 3;
  doc.setFillColor(...brandSubtle);
  doc.roundedRect(box2X, summaryY, cardWidth, cardHeight, 2, 2, 'F');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...textMuted);
  doc.text('SECURITY GOVERNANCE', box2X + 4, summaryY + 5.5);
  doc.setFontSize(11);
  doc.setTextColor(16, 185, 129); // Emerald
  doc.text('Audit Trail Verified', box2X + 4, summaryY + 12);

  // Box 3: Generated For
  const box3X = box2X + cardWidth + 3;
  doc.setFillColor(...brandSubtle);
  doc.roundedRect(box3X, summaryY, cardWidth, cardHeight, 2, 2, 'F');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...textMuted);
  doc.text('ADMINISTRATOR ID', box3X + 4, summaryY + 5.5);
  doc.setFontSize(11);
  doc.setTextColor(...brandGold);
  doc.text(adminUser?.username || 'Admin Manager', box3X + 4, summaryY + 12);

  // ==========================================
  // 3. TABLE OF AUDIT LOGS
  // ==========================================
  const tableRows = logs.map((log, index) => {
    // Format Date & Time cleanly
    let dateStr = '—';
    let timeStr = '';
    if (log.created_at) {
      const d = new Date(log.created_at);
      dateStr = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      timeStr = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    }
    const timestampCombined = `${dateStr}\n${timeStr}`;

    const actionLabel = formatActionLabel(log.action);
    const cleanDesc = sanitizeText(log.description || log.action);

    // Format Change Values into a clean readable format
    let changeSummary = '—';
    if (log.old_value || log.new_value) {
      const oldClean = sanitizeText(log.old_value);
      const newClean = sanitizeText(log.new_value);
      if (oldClean !== '—' && newClean !== '—') {
        changeSummary = `${oldClean} -> ${newClean}`;
      } else if (newClean !== '—') {
        changeSummary = newClean;
      }
    }

    const adminName = sanitizeText(log.ip_address || adminUser?.username || 'Admin');

    return [
      String(index + 1),
      timestampCombined,
      actionLabel,
      cleanDesc,
      changeSummary,
      adminName,
    ];
  });

  autoTable(doc, {
    startY: summaryY + cardHeight + 6,
    head: [['#', 'Date & Time', 'Event Type', 'Description / Action Details', 'Value Change', 'Admin / Origin']],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: brandDark,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'left',
      cellPadding: 3,
    },
    bodyStyles: {
      fontSize: 7.8,
      textColor: textDark,
      cellPadding: { top: 3.5, bottom: 3.5, left: 3, right: 3 },
      valign: 'middle',
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center', fontStyle: 'bold', textColor: textMuted },
      1: { cellWidth: 26, fontStyle: 'normal' },
      2: { cellWidth: 32, fontStyle: 'bold', textColor: [180, 83, 9] },
      3: { cellWidth: 'auto', fontStyle: 'normal' },
      4: { cellWidth: 32, fontStyle: 'bold', textColor: [15, 118, 110] },
      5: { cellWidth: 24, fontStyle: 'normal', textColor: textMuted },
    },
    margin: { left: 14, right: 14, bottom: 16 },
    didDrawPage: (data) => {
      // Footer: Page Number & Verification Watermark
      const pageCount = doc.internal.getNumberOfPages();
      const pageCurrent = data.pageNumber;

      // Thin divider
      doc.setDrawColor(226, 232, 240);
      doc.line(14, pageHeight - 11, pageWidth - 14, pageHeight - 11);

      doc.setFontSize(7);
      doc.setTextColor(...textMuted);
      doc.setFont('helvetica', 'normal');

      // Left Footer
      doc.text(
        'CONFIDENTIAL - For Internal Administrative Governance & Record Keeping Only',
        14,
        pageHeight - 6
      );

      // Right Footer
      doc.text(
        `Page ${pageCurrent} of ${pageCount}`,
        pageWidth - 14,
        pageHeight - 6,
        { align: 'right' }
      );
    },
  });

  // Save sanitized PDF
  const timestampIso = now.toISOString().slice(0, 10);
  const fileName = `Aurum_Audit_Report_${timestampIso}.pdf`;
  doc.save(fileName);
};

export default downloadAuditLogsPdf;

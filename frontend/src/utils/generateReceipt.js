import { jsPDF } from 'jspdf';

/**
 * Generate a unique transaction hash for validity/verification.
 * Combines transaction id, reference, amount, and date into a SHA-like hex string.
 */
function generateTxHash(tx) {
  const raw = `${tx.id}-${tx.reference}-${tx.amount}-${tx.created_at}-PAYWISE`;
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const chr = raw.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0;
  }
  const hex1 = Math.abs(hash).toString(16).padStart(8, '0');

  let hash2 = 0x811c9dc5;
  for (let i = 0; i < raw.length; i++) {
    hash2 ^= raw.charCodeAt(i);
    hash2 = Math.imul(hash2, 0x01000193);
  }
  const hex2 = (hash2 >>> 0).toString(16).padStart(8, '0');

  let hash3 = 5381;
  for (let i = 0; i < raw.length; i++) {
    hash3 = ((hash3 << 5) + hash3) + raw.charCodeAt(i);
  }
  const hex3 = (hash3 >>> 0).toString(16).padStart(8, '0');

  let hash4 = 0;
  for (let i = 0; i < raw.length; i++) {
    hash4 = raw.charCodeAt(i) + ((hash4 << 6) + (hash4 << 16) - hash4);
  }
  const hex4 = (hash4 >>> 0).toString(16).padStart(8, '0');

  return `${hex1}-${hex2}-${hex3}-${hex4}`.toUpperCase();
}

/**
 * Format IBAN with spaces every 4 characters.
 */
function formatIBAN(iban) {
  if (!iban) return 'N/A';
  return iban.replace(/(.{4})/g, '$1 ').trim();
}

/**
 * Format currency amount.
 */
function formatAmount(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format date to readable string.
 */
function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Draw a rounded rectangle on the PDF.
 */
function roundedRect(doc, x, y, w, h, r, style) {
  doc.roundedRect(x, y, w, h, r, r, style);
}

/**
 * Generate and download a PDF receipt for the given transaction.
 * @param {Object} tx - Transaction object with all fields from the API.
 */
export function generateTransactionPDF(tx) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageW = 210;
  const margin = 20;
  const contentW = pageW - margin * 2;
  const isSent = tx.direction === 'sent';
  const txHash = generateTxHash(tx);

  // ==========================================
  // BACKGROUND
  // ==========================================
  doc.setFillColor(6, 13, 18);
  doc.rect(0, 0, 210, 297, 'F');

  // Subtle gradient overlay at top
  doc.setFillColor(11, 24, 32);
  doc.rect(0, 0, 210, 90, 'F');

  // Decorative teal accent bar
  doc.setFillColor(0, 201, 167);
  doc.rect(0, 0, 210, 4, 'F');

  // ==========================================
  // LOGO & HEADER
  // ==========================================
  // Logo mark (teal rounded square)
  doc.setFillColor(0, 201, 167);
  roundedRect(doc, margin, 16, 14, 14, 3, 'F');

  doc.setTextColor(6, 13, 18);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('PW', margin + 7, 25, { align: 'center' });

  // PayWise text
  doc.setTextColor(232, 245, 242);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('Pay', margin + 17, 26);

  doc.setTextColor(0, 201, 167);
  doc.text('Wise', margin + 34, 26);

  // Tagline
  doc.setTextColor(127, 184, 173);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Transaction Receipt', margin + 56, 26);

  // Reference in top right
  doc.setTextColor(61, 107, 98);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`REF: ${tx.reference || 'N/A'}`, pageW - margin, 20, { align: 'right' });
  doc.text(`Date: ${formatDate(tx.created_at)}`, pageW - margin, 26, { align: 'right' });

  // ==========================================
  // DIVIDER
  // ==========================================
  doc.setDrawColor(0, 201, 167);
  doc.setLineWidth(0.2);
  doc.line(margin, 36, pageW - margin, 36);

  // ==========================================
  // STATUS BADGE
  // ==========================================
  let y = 46;

  // Status & Direction row
  const statusText = (tx.status || 'completed').toUpperCase();
  const dirText = isSent ? 'OUTGOING TRANSFER' : 'INCOMING TRANSFER';

  // Direction badge
  if (isSent) {
    doc.setFillColor(255, 107, 122, 25);
    doc.setTextColor(255, 107, 122);
  } else {
    doc.setFillColor(0, 229, 160, 25);
    doc.setTextColor(0, 229, 160);
  }
  roundedRect(doc, margin, y - 4, 42, 8, 2, 'F');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text(dirText, margin + 21, y + 1, { align: 'center' });

  // Status badge
  doc.setFillColor(0, 229, 160, 25);
  doc.setTextColor(0, 229, 160);
  roundedRect(doc, margin + 46, y - 4, 26, 8, 2, 'F');
  doc.text(statusText, margin + 59, y + 1, { align: 'center' });

  // ==========================================
  // AMOUNT SECTION (BIG)
  // ==========================================
  y += 20;

  doc.setFillColor(15, 32, 48);
  roundedRect(doc, margin, y - 8, contentW, 36, 4, 'F');

  // Border
  doc.setDrawColor(0, 201, 167);
  doc.setLineWidth(0.3);
  roundedRect(doc, margin, y - 8, contentW, 36, 4, 'S');

  doc.setTextColor(61, 107, 98);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('AMOUNT', margin + 8, y);

  doc.setTextColor(232, 245, 242);
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  const prefix = isSent ? '− ' : '+ ';
  doc.text(prefix + formatAmount(tx.amount), margin + 8, y + 16);

  if (tx.fee && parseFloat(tx.fee) > 0) {
    doc.setTextColor(245, 166, 35);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Fee: ${formatAmount(tx.fee)}`, pageW - margin - 8, y + 16, { align: 'right' });
  }

  // Category
  doc.setTextColor(0, 201, 167);
  doc.setFontSize(8);
  doc.text(`Category: ${(tx.category || 'transfer').toUpperCase()}`, pageW - margin - 8, y, { align: 'right' });

  // ==========================================
  // SENDER & RECEIVER DETAILS
  // ==========================================
  y += 44;

  // --- SENDER CARD ---
  doc.setFillColor(11, 24, 32);
  roundedRect(doc, margin, y, contentW, 40, 4, 'F');
  doc.setDrawColor(0, 201, 167);
  doc.setLineWidth(0.15);
  roundedRect(doc, margin, y, contentW, 40, 4, 'S');

  // Sender header
  doc.setFillColor(0, 201, 167);
  roundedRect(doc, margin, y, contentW, 10, 4, 'F');
  // Cover bottom corners of header
  doc.setFillColor(0, 201, 167);
  doc.rect(margin, y + 6, contentW, 4, 'F');

  doc.setTextColor(6, 13, 18);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('SENDER', margin + 6, y + 7);

  // Sender avatar
  doc.setTextColor(232, 245, 242);
  doc.setFontSize(16);
  doc.text(tx.sender_avatar || '👤', margin + 6, y + 22);

  // Sender name
  doc.setTextColor(232, 245, 242);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(tx.sender_name || 'Unknown', margin + 16, y + 21);

  // Sender IBAN
  doc.setTextColor(0, 201, 167);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`IBAN: ${formatIBAN(tx.sender_iban)}`, margin + 6, y + 32);

  // --- ARROW ---
  y += 44;
  doc.setTextColor(245, 166, 35);
  doc.setFontSize(16);
  doc.text('↓', pageW / 2, y, { align: 'center' });

  y += 6;

  // --- RECEIVER CARD ---
  doc.setFillColor(11, 24, 32);
  roundedRect(doc, margin, y, contentW, 40, 4, 'F');
  doc.setDrawColor(245, 166, 35);
  doc.setLineWidth(0.15);
  roundedRect(doc, margin, y, contentW, 40, 4, 'S');

  // Receiver header
  doc.setFillColor(245, 166, 35);
  roundedRect(doc, margin, y, contentW, 10, 4, 'F');
  doc.setFillColor(245, 166, 35);
  doc.rect(margin, y + 6, contentW, 4, 'F');

  doc.setTextColor(6, 13, 18);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('RECEIVER', margin + 6, y + 7);

  // Receiver avatar
  doc.setTextColor(232, 245, 242);
  doc.setFontSize(16);
  doc.text(tx.receiver_avatar || '👤', margin + 6, y + 22);

  // Receiver name
  doc.setTextColor(232, 245, 242);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(tx.receiver_name || 'Unknown', margin + 16, y + 21);

  // Receiver IBAN
  doc.setTextColor(245, 166, 35);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`IBAN: ${formatIBAN(tx.receiver_iban)}`, margin + 6, y + 32);

  // ==========================================
  // TRANSACTION DETAILS TABLE
  // ==========================================
  y += 52;

  doc.setFillColor(15, 32, 48);
  roundedRect(doc, margin, y, contentW, 48, 4, 'F');

  doc.setTextColor(0, 201, 167);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('TRANSACTION DETAILS', margin + 6, y + 8);

  doc.setDrawColor(0, 201, 167);
  doc.setLineWidth(0.1);
  doc.line(margin + 6, y + 11, pageW - margin - 6, y + 11);

  const details = [
    ['Reference', tx.reference || 'N/A'],
    ['Date & Time', formatDate(tx.created_at)],
    ['Type', (tx.type || 'transfer').charAt(0).toUpperCase() + (tx.type || 'transfer').slice(1)],
    ['Note', tx.note || '—'],
  ];

  let detailY = y + 18;
  details.forEach(([label, value]) => {
    doc.setTextColor(61, 107, 98);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(label, margin + 6, detailY);

    doc.setTextColor(232, 245, 242);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(String(value), pageW - margin - 6, detailY, { align: 'right' });

    detailY += 9;
  });

  // ==========================================
  // VERIFICATION HASH
  // ==========================================
  y += 58;

  doc.setFillColor(21, 40, 64);
  roundedRect(doc, margin, y, contentW, 22, 4, 'F');

  doc.setDrawColor(245, 166, 35);
  doc.setLineWidth(0.2);
  roundedRect(doc, margin, y, contentW, 22, 4, 'S');

  doc.setTextColor(245, 166, 35);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text('🔒 VERIFICATION HASH', margin + 6, y + 7);

  doc.setTextColor(127, 184, 173);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(txHash, margin + 6, y + 16);

  // ==========================================
  // FOOTER
  // ==========================================
  const footerY = 270;

  doc.setDrawColor(0, 201, 167);
  doc.setLineWidth(0.1);
  doc.line(margin, footerY, pageW - margin, footerY);

  doc.setTextColor(61, 107, 98);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('This document is an official PayWise transaction receipt.', pageW / 2, footerY + 6, { align: 'center' });
  doc.text('The verification hash above can be used to validate the authenticity of this receipt.', pageW / 2, footerY + 11, { align: 'center' });

  doc.setTextColor(0, 201, 167);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('PayWise Banking Platform', margin, footerY + 20);

  doc.setTextColor(61, 107, 98);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${new Date().toLocaleString()}`, pageW - margin, footerY + 20, { align: 'right' });

  // ==========================================
  // SAVE
  // ==========================================
  const fileName = `PayWise_Receipt_${tx.reference || tx.id}_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(fileName);
}

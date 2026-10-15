import PDFDocument from 'pdfkit';

/**
 * Generates an in-memory A4 PDF invoice Buffer for a college subscription.
 *
 * @param {Object} data
 * @param {string} data.invoiceNumber
 * @param {string} data.invoiceDateIST
 * @param {string} data.collegeName
 * @param {string} data.planName
 * @param {string} data.validFromIST
 * @param {string} data.validUntilIST
 * @param {string|null} [data.amountStr]
 * @param {string} data.paymentStatus
 * @returns {Promise<Buffer>}
 */
export async function generateInvoicePDF({
  invoiceNumber,
  invoiceDateIST,
  collegeName,
  planName,
  validFromIST,
  validUntilIST,
  amountStr,
  paymentStatus,
}) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const left = doc.page.margins.left;
    const top = doc.page.margins.top;
    const pageWidth = doc.page.width;
    const contentWidth = pageWidth - doc.page.margins.left - doc.page.margins.right;

    // Header banner bar (Dark Navy)
    doc.rect(left, top, contentWidth, 65).fill('#0f172a');

    // Header text
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(20)
      .text('Zuna Campus OS', left + 20, top + 15);
    doc.fillColor('#94a3b8').font('Helvetica').fontSize(9)
      .text('Institutional Subscription Management & Invoicing', left + 20, top + 42);

    // Right-aligned header badge
    doc.fillColor('#38bdf8').font('Helvetica-Bold').fontSize(12)
      .text('OFFICIAL INVOICE', left, top + 18, { width: contentWidth - 20, align: 'right' });
    doc.fillColor('#cbd5e1').font('Helvetica').fontSize(9)
      .text(`Date: ${invoiceDateIST}`, left, top + 38, { width: contentWidth - 20, align: 'right' });

    let y = top + 85;

    // Invoice Meta Summary Box
    doc.roundedRect(left, y, contentWidth, 55, 6).lineWidth(1).strokeColor('#e2e8f0').fillAndStroke('#f8fafc', '#e2e8f0');

    doc.fillColor('#64748b').font('Helvetica-Bold').fontSize(8.5)
      .text('INVOICE NUMBER', left + 16, y + 12);
    doc.fillColor('#0d9488').font('Helvetica-Bold').fontSize(12)
      .text(invoiceNumber, left + 16, y + 25);

    doc.fillColor('#64748b').font('Helvetica-Bold').fontSize(8.5)
      .text('BILLED TO (INSTITUTION)', left + 220, y + 12);
    doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(11)
      .text(collegeName, left + 220, y + 26, { width: contentWidth - 230, ellipsis: true });

    y += 75;

    // Section title
    doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(13)
      .text('Subscription & Service Summary', left, y);

    y += 20;

    // Table Header
    const rowH = 28;
    doc.rect(left, y, contentWidth, rowH).fill('#1e293b');
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(9.5)
      .text('Description / Detail', left + 16, y + 9);
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(9.5)
      .text('Specification', left + 200, y + 9, { width: contentWidth - 216, align: 'right' });

    y += rowH;

    // Table rows
    const rows = [
      { label: 'Institution Name', val: collegeName, boldVal: true },
      { label: 'Subscription Plan', val: planName, colorVal: '#0d9488', boldVal: true },
      { label: 'Coverage Period (Valid From)', val: `${validFromIST} (IST)` },
      { label: 'Expiration Date (Valid Until)', val: `${validUntilIST} (IST)` },
    ];

    if (amountStr) {
      rows.push({ label: 'Subscription Amount', val: amountStr, boldVal: true });
    }

    rows.push({ label: 'Payment Status', val: paymentStatus, colorVal: '#16a34a', boldVal: true });

    rows.forEach((r, idx) => {
      const bg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
      doc.rect(left, y, contentWidth, rowH).fill(bg);
      doc.rect(left, y, contentWidth, rowH).strokeColor('#e2e8f0').lineWidth(0.5).stroke();

      doc.fillColor('#475569').font('Helvetica').fontSize(9.5)
        .text(r.label, left + 16, y + 9);

      doc.fillColor(r.colorVal || '#0f172a')
        .font(r.boldVal ? 'Helvetica-Bold' : 'Helvetica')
        .fontSize(9.5)
        .text(r.val, left + 200, y + 9, { width: contentWidth - 216, align: 'right' });

      y += rowH;
    });

    y += 35;

    // Terms / Information Box
    doc.roundedRect(left, y, contentWidth, 70, 6).lineWidth(1).strokeColor('#e2e8f0').fillAndStroke('#f8fafc', '#e2e8f0');

    doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(9.5)
      .text('Important Information & Platform Terms', left + 16, y + 12);
    doc.fillColor('#64748b').font('Helvetica').fontSize(8.5)
      .text(
        '• This subscription provides full administrative access to student management, academics, examinations, and departmental services.\n' +
        '• System-generated document from Zuna Campus Operating System. No physical signature required.\n' +
        '• For renewals, upgrades, or billing inquiries, please contact our administrative desk.',
        left + 16,
        y + 26,
        { lineGap: 3 }
      );

    // Footer at bottom of A4
    const footerY = doc.page.height - doc.page.margins.bottom - 40;
    doc.strokeColor('#e2e8f0').lineWidth(1).moveTo(left, footerY).lineTo(left + contentWidth, footerY).stroke();

    doc.fillColor('#64748b').font('Helvetica').fontSize(8)
      .text('Zuna Campus Operating System  |  support@teamzuna.in  |  https://teamzuna.in', left, footerY + 12, {
        align: 'center',
        width: contentWidth,
      });

    doc.fillColor('#94a3b8').font('Helvetica').fontSize(7.5)
      .text(`Generated on ${invoiceDateIST} (IST)  •  Invoice Ref: ${invoiceNumber}`, left, footerY + 26, {
        align: 'center',
        width: contentWidth,
      });

    doc.end();
  });
}

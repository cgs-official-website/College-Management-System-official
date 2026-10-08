import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import PDFDocument from 'pdfkit';
import sharp from 'sharp';
import { prisma, logger } from '../../server.js';

const httpError = (statusCode, code, message) =>
  Object.assign(new Error(message), { statusCode, code });

const money = (n) =>
  `Rs. ${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const YEAR_LABELS = { '1': '1st Year', '2': '2nd Year', '3': '3rd Year', '4': '4th Year' };

const formatDate = (d) =>
  new Date(d).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });


const MAX_LOGO_BYTES = 5 * 1024 * 1024;

const toPng = (buf, size) =>
  sharp(buf, { limitInputPixels: 50_000_000 })
    .resize({ width: size, height: size, fit: 'inside', withoutEnlargement: true })
    .png()
    .toBuffer();

const loadLogoOnce = async (url) => {
  let buf;
  if (url.startsWith('data:')) {
    const m = url.match(/^data:[^;,]*;base64,(.+)$/s);
    if (!m) throw new Error('unsupported data URL');
    buf = Buffer.from(m[1], 'base64');
  } else if (/^https?:\/\//i.test(url)) {
    const r = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    buf = Buffer.from(await r.arrayBuffer());
  } else {
    throw new Error('logo URL must start with http(s)://');
  }
  if (buf.length > MAX_LOGO_BYTES) throw new Error('logo file is larger than 5 MB');
  return toPng(buf, 300);
};

const logoCache = new Map();

const fetchCollegeLogo = async (url) => {
  if (!url) return null; 

  let lastError;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const png = await loadLogoOnce(url);
      if (logoCache.size >= 50) logoCache.clear();
      logoCache.set(url, png);
      return png;
    } catch (e) {
      lastError = e;
      logger.warn(`[warn] Store bill: college logo attempt ${attempt}/3 failed (${e.message})`);
      if (attempt < 3) await new Promise((r) => setTimeout(r, 400 * attempt));
    }
  }

  if (logoCache.has(url)) return logoCache.get(url);

  throw httpError(
    502, 'LOGO_UNAVAILABLE',
    `The college logo could not be loaded (${lastError.message}). Re-upload the logo in Environment Setup, or try again.`
  );
};

const here = path.dirname(fileURLToPath(import.meta.url));
const POWERED_BY_PATH = path.resolve(here, '../../assets/logo.png');
let poweredByCache = null;

const getPoweredByLogo = async () => {
  if (poweredByCache) return poweredByCache;
  try {
    poweredByCache = await toPng(await fs.readFile(POWERED_BY_PATH), 120);
    return poweredByCache;
  } catch (e) {
    logger.warn(`[warn] Store bill: 'Powered by' logo not found at ${POWERED_BY_PATH} (${e.message})`);
    return null;
  }
};

// PDF
const buildPdf = (sale, college, logo, poweredBy) =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const L = 40;
    const R = 555;
    const GREY = '#64748b';
    const DARK = '#0f172a';
    const COLS = { sr: 40, item: 68, qty: 330, price: 375, total: 450 };

    const pad = logo ? 72 : 0;
    const tx = L + pad;
    const tw = R - L - pad * 2;
    if (logo) {
      try { doc.image(logo, L, 40, { fit: [60, 60] }); } catch { /* unreadable image: skip */ }
    }

    // line 1: college name
    doc.font('Helvetica-Bold').fontSize(16).fillColor(DARK)
      .text(college?.name || 'Campus Store', tx, 42, { width: tw, align: 'center' });

    // line 2: address
    doc.font('Helvetica').fontSize(9).fillColor(GREY);
    if (college?.address) doc.text(college.address, tx, doc.y + 2, { width: tw, align: 'center' });

    // line 3: phone and email
    const contact = [
      college?.contactPhone && `Phone Number: ${college.contactPhone}`,
      college?.contactEmail && `Email: ${college.contactEmail}`,
    ].filter(Boolean).join(', ');
    if (contact) doc.text(contact, tx, doc.y + 2, { width: tw, align: 'center' });

    let y = Math.max(doc.y, logo ? 108 : 0) + 12;
    doc.moveTo(L, y).lineTo(R, y).lineWidth(1).strokeColor('#cbd5e1').stroke();
    y += 12;

    // ---------- invoice meta ----------
    doc.font('Helvetica-Bold').fontSize(13).fillColor(DARK).text('SALES INVOICE', L, y);
    doc.font('Helvetica').fontSize(10).fillColor(DARK)
      .text(`Invoice No: ${sale.invoiceNo}`, 300, y, { width: R - 300, align: 'right' });
    doc.fillColor(GREY).text(`Date: ${formatDate(sale.createdAt)}`, 300, y + 15, { width: R - 300, align: 'right' });
    y += 38;

    // ---------- customer ----------
    doc.font('Helvetica-Bold').fontSize(9).fillColor(GREY).text('BILLED TO', L, y);
    y += 13;
    doc.font('Helvetica-Bold').fontSize(11).fillColor(DARK).text(sale.customerName, L, y, { width: R - L });
    y = doc.y + 2;

    const typeLabel = { STUDENT: 'Student', STAFF: 'Staff', OTHER: null }[sale.customerType];
    const detail = [
      typeLabel,
      sale.department,
      sale.year && (YEAR_LABELS[sale.year] || sale.year),
      sale.section && `Section ${sale.section}`,
      sale.rollNo && `Roll No: ${sale.rollNo}`,
    ].filter(Boolean).join('  |  ');
    if (detail) {
      doc.font('Helvetica').fontSize(10).fillColor(GREY).text(detail, L, y, { width: R - L });
      y = doc.y;
    }
    y += 14;

    // ---------- items table ----------
    const drawTableHeader = (yy) => {
      doc.rect(L, yy, R - L, 20).fill('#f1f5f9');
      doc.font('Helvetica-Bold').fontSize(9).fillColor(GREY);
      doc.text('#', COLS.sr + 4, yy + 6, { width: 22 });
      doc.text('ITEM', COLS.item, yy + 6, { width: 250 });
      doc.text('QTY', COLS.qty, yy + 6, { width: 40, align: 'right' });
      doc.text('PRICE', COLS.price, yy + 6, { width: 70, align: 'right' });
      doc.text('TOTAL', COLS.total, yy + 6, { width: 105, align: 'right' });
      return yy + 26;
    };

    y = drawTableHeader(y);
    sale.items.forEach((it, idx) => {
      if (y > 720) {
        doc.addPage();
        y = drawTableHeader(40);
      }
      doc.font('Helvetica').fontSize(10).fillColor(DARK);
      const h = doc.heightOfString(it.name, { width: 255 });
      doc.text(String(idx + 1), COLS.sr + 4, y, { width: 22 });
      doc.text(it.name, COLS.item, y, { width: 255 });
      doc.text(String(it.quantity), COLS.qty, y, { width: 40, align: 'right' });
      doc.text(money(it.unitPrice), COLS.price, y, { width: 70, align: 'right' });
      doc.text(money(it.lineTotal), COLS.total, y, { width: 105, align: 'right' });
      y += Math.max(h, 14) + 8;
      doc.moveTo(L, y - 4).lineTo(R, y - 4).lineWidth(0.5).strokeColor('#e2e8f0').stroke();
    });

    // ---------- totals ----------
    if (y > 650) { doc.addPage(); y = 40; }
    y += 6;
    const row = (label, value, bold) => {
      doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(bold ? 12 : 10).fillColor(DARK);
      doc.text(label, 330, y, { width: 100 });
      doc.text(value, 430, y, { width: 125, align: 'right' });
      y += bold ? 20 : 16;
    };
    row('Subtotal', money(sale.subtotal));
    if (Number(sale.discount) > 0) row('Discount', `- ${money(sale.discount)}`);
    doc.moveTo(330, y).lineTo(R, y).lineWidth(1).strokeColor('#cbd5e1').stroke();
    y += 6;
    row('Total', money(sale.total), true);

    // ---------- payment + footer ----------
    y += 10;
    doc.font('Helvetica').fontSize(10).fillColor(DARK).text(
      `Payment: ${sale.paymentMethod}${sale.paymentRef ? `  (Ref: ${sale.paymentRef})` : ''}`, L, y, { width: R - L });
    if (sale.createdByName) {
      doc.fillColor(GREY).text(`Issued by: ${sale.createdByName}`, L, doc.y + 3, { width: R - L });
    }
    doc.moveDown(2);
    doc.font('Helvetica').fontSize(8).fillColor(GREY)
      .text('This is a computer-generated bill.', L, doc.y, { width: R - L, align: 'center' });

    if (poweredBy) {
      try {
        const LOGO_H = 16;
        const GAP = 5;
        let py = doc.y + 10;
        if (py > 770) { doc.addPage(); py = 40; }

        const img = doc.openImage(poweredBy);
        const logoW = (img.width / img.height) * LOGO_H;

        doc.font('Helvetica').fontSize(8);
        const label = 'Powered by';
        const labelW = doc.widthOfString(label);
        const startX = L + ((R - L) - (labelW + GAP + logoW)) / 2; 

        doc.fillColor(GREY).text(label, startX, py + (LOGO_H - 8) / 2, { lineBreak: false });
        doc.image(poweredBy, startX + labelW + GAP, py, { height: LOGO_H });
      } catch { /* unreadable image: skip the line */ }
    }

    doc.end();
  });

// GET /store/sales/:id/pdf
export const getSaleBillPdf = async (req, res) => {
  const collegeId = req.tenant?.collegeId || req.user?.collegeId;
  if (!collegeId) throw httpError(403, 'FORBIDDEN', 'Tenant context missing');

  const sale = await prisma.storeSale.findFirst({
    where: { id: req.params.id, collegeId },
    include: { items: true },
  });
  if (!sale) throw httpError(404, 'NOT_FOUND', 'Sale not found');

  const college = await prisma.college.findUnique({
    where: { id: collegeId },
    select: { name: true, address: true, logoUrl: true, contactPhone: true, contactEmail: true },
  });

  const [logo, poweredBy] = await Promise.all([
    fetchCollegeLogo(college?.logoUrl),
    getPoweredByLogo(),
  ]);

  const pdf = await buildPdf(sale, college, logo, poweredBy); 

  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `inline; filename="${sale.invoiceNo}.pdf"`,
    'Content-Length': pdf.length,
    'Cache-Control': 'private, no-store',
  });
  res.send(pdf);
};
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { amountToWords } from './numberToWords.js';

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const NAVY = '#0b1160';
const TEXT = '#111111';
const BORDER = '#000000';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const val = (v) => (v === undefined || v === null || v === '' ? '-' : String(v));

const amt = (n) =>
  n === undefined || n === null || n === '' || Number.isNaN(Number(n))
    ? '-'
    : Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const loadFooterLogo = () => {
  const candidates = [
    process.env.PAYSLIP_FOOTER_LOGO,
    path.resolve(__dirname, '../../../../Frontend/public/logo.png'), // Backend/src/services/pdf -> project root
    path.resolve(process.cwd(), '../Frontend/public/logo.png'),
    path.resolve(process.cwd(), 'Frontend/public/logo.png')
  ].filter(Boolean);
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) return fs.readFileSync(p);
    } catch { /* try next */ }
  }
  return null;
};

const loadLogo = async (logoUrl) => {
  if (!logoUrl) return null;
  try {
    if (logoUrl.startsWith('data:')) {
      return Buffer.from(logoUrl.split(',')[1] || '', 'base64');
    }
    if (/^https?:\/\//i.test(logoUrl)) {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 5000);
      try {
        const res = await fetch(logoUrl, { signal: ctrl.signal });
        if (!res.ok) return null;
        return Buffer.from(await res.arrayBuffer());
      } finally {
        clearTimeout(timer);
      }
    }
    const localPath = path.resolve(process.cwd(), logoUrl.replace(/^\/+/, ''));
    if (fs.existsSync(localPath)) return fs.readFileSync(localPath);
  } catch { /* fall through */ }
  return null;
};


export const generatePayslipPDF = async (data) => {
  const {
    collegeName = 'College / Institution',
    logoUrl,
    officeAddress,
    month,
    year,
    staffName, empCode, department, designation, joiningDate, grade, costCenter,
    pfNo, pfUan, panNo, gender, bankAccountNo, ifsc,
    paidDays, workingDays, lossOfPayDays,
    basicPay, hra, da, conveyance, specialAllowance, basicProrated, hraProrated, otherAllowance,
    pf, lossOfPay, pt, esi, tds, otherDeductions,
    grossPay, grossDeduction, netPay
  } = data;

  const logoBuffer = await loadLogo(logoUrl);
  const footerLogo = loadFooterLogo();
  const monthName = MONTH_NAMES[(month || 1) - 1] || month;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const left = doc.page.margins.left;
    const W = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const right = left + W;
    let y = doc.page.margins.top;

    const hLine = (yy, w = 1) =>
      doc.moveTo(left, yy).lineTo(right, yy).lineWidth(w).strokeColor(BORDER).stroke();
    const box = (x, yy, w, h) =>
      doc.rect(x, yy, w, h).lineWidth(0.7).strokeColor(BORDER).stroke();

    if (logoBuffer) {
      try { doc.image(logoBuffer, left, y, { fit: [50, 50] }); } catch { /* unsupported image type */ }
    }
    doc.font('Helvetica-Bold').fontSize(17).fillColor(NAVY)
      .text(collegeName, left + 60, y + 16, { width: W - 120, align: 'center' });
    y += 66;

    hLine(y, 1);
    doc.font('Helvetica-Bold').fontSize(20).fillColor('#000000')
      .text('PAYSLIP', left, y + 9, { width: W, align: 'center' });
    y += 40;
    hLine(y, 1);
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#000000')
      .text(`Payslip for the month of ${monthName}, ${year}`, left, y + 8, { width: W, align: 'center' });
    y += 28;
    hLine(y, 2.5);
    y += 12;

    const ic = [105, 152, 105, 153];               
    const ix = [left, left + 105, left + 257, left + 362];
    const PAD = 6;
    const infoRows = [
      [['Name', staffName], ['Office Address', officeAddress]],
      [['ID', empCode], ['Joining Date', joiningDate]],
      [['Department', department], ['Paid Days', paidDays]],
      [['Designation', designation], ['Working Days', workingDays]],
      [['Grade', grade], ['Cost Center', costCenter]],
      [['PF No.', pfNo], ['PAN', panNo]],
      [['PF UAN', pfUan], ['Gender', gender]],
      [['Bank Account No.', bankAccountNo], ['Loss of Pay Days', lossOfPayDays]],
      [['IFSC', ifsc], ['', '']]
    ];

    doc.fontSize(9.5);
    infoRows.forEach(([l, r]) => {
      doc.font('Helvetica');
      const hL = doc.heightOfString(val(l[1]), { width: ic[1] - PAD * 2 });
      const hR = r[0] ? doc.heightOfString(val(r[1]), { width: ic[3] - PAD * 2 }) : 0;
      const rowH = Math.max(22, hL + 12, hR + 12);

      [0, 1, 2, 3].forEach((i) => box(ix[i], y, ic[i], rowH));

      doc.font('Helvetica-Bold').fillColor(TEXT);
      doc.text(l[0], ix[0] + PAD, y + 6, { width: ic[0] - PAD * 2 });
      if (r[0]) doc.text(r[0], ix[2] + PAD, y + 6, { width: ic[2] - PAD * 2 });

      doc.font('Helvetica').fillColor(TEXT);
      doc.text(val(l[1]), ix[1] + PAD, y + 6, { width: ic[1] - PAD * 2 });
      if (r[0]) doc.text(val(r[1]), ix[3] + PAD, y + 6, { width: ic[3] - PAD * 2 });

      y += rowH;
    });
    y += 16;

    const cw = [180, 77, 180, 78];                 
    const cx = [left, left + 180, left + 257, left + 437];
    const rowH = 22;

    const cell = (text, i, yy, { bold = false, align } = {}) => {
      const a = align || (i % 2 === 0 ? 'left' : 'right');
      doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(9.5).fillColor(TEXT)
        .text(text, cx[i] + PAD, yy + 6, { width: cw[i] - PAD * 2, align: a, lineBreak: false });
    };
    const boxRow = (yy, h = rowH) => cw.forEach((w, i) => box(cx[i], yy, w, h));

    boxRow(y);
    cell('Earnings', 0, y, { bold: true });
    cell('Earned Amt.', 1, y, { bold: true });
    cell('Deductions', 2, y, { bold: true });
    cell('Amount', 3, y, { bold: true });
    y += rowH;

    const earnings = [
      ['Basic', basicPay],
      ['House Rent Allowance', hra],
      ...(Number(da) > 0 ? [['Dearness Allowance', da]] : []),
      ['Conveyance', conveyance],
      ['Special Allowance', specialAllowance],
      ['Basic (Prorated)', basicProrated],
      ['HRA (Prorated)', hraProrated],
      ['Other Allowance', otherAllowance]
    ];
    const deductions = [
      ['Provident Fund', pf],
      ['Loss of Pay', lossOfPay],
      ['Professional Tax', pt],
      ...(Number(esi) > 0 ? [['ESI', esi]] : []),
      ...(Number(tds) > 0 ? [['TDS', tds]] : []),
      ...(Number(otherDeductions) > 0 ? [['Other Deductions', otherDeductions]] : [])
    ];

    const rows = Math.max(earnings.length, deductions.length);
    for (let i = 0; i < rows; i++) {
      boxRow(y);
      const e = earnings[i];
      const d = deductions[i];
      if (e) { cell(e[0], 0, y); cell(amt(e[1]), 1, y); }
      if (d) { cell(d[0], 2, y); cell(amt(d[1]), 3, y); }
      y += rowH;
    }

    boxRow(y);
    cell('Gross Earning', 0, y, { bold: true });
    cell(amt(grossPay), 1, y, { bold: true });
    cell('Gross Deduction', 2, y, { bold: true });
    cell(amt(grossDeduction), 3, y, { bold: true });
    y += rowH;

    boxRow(y);
    cell('Net Amount', 0, y, { bold: true });
    cell(amt(netPay), 1, y, { bold: true });
    y += rowH + 12;

    doc.font('Helvetica').fontSize(9.5).fillColor(TEXT)
      .text(`Net Amount in words: ${amountToWords(netPay)}`, left, y, { width: W });
    y += 22;
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#000000')
      .text('Disclaimer: This is a system generated payslip, does not require any signature.', left, y, { width: W });
    y += 34;

    const t1 = 'Powered by';
    const LOGO = 22;
    const gap = 6;
    doc.font('Helvetica-Bold').fontSize(9.5);
    const w1 = doc.widthOfString(t1);
    const total = w1 + (footerLogo ? gap + LOGO : 0);
    let px = left + (W - total) / 2;

    doc.fillColor('#000000').text(t1, px, y + 6, { lineBreak: false });
    px += w1 + gap;
    if (footerLogo) {
      try { doc.image(footerLogo, px, y, { fit: [LOGO, LOGO] }); } catch { /* unsupported image type */ }
    }

    doc.end();
  });
};
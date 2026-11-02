import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const ACCENT = [5, 150, 105];
const DARK = [15, 23, 42];

const API_ORIGIN = import.meta.env.VITE_API_URL
  ? new URL(import.meta.env.VITE_API_URL, window.location.origin).origin
  : 'http://localhost:5000';

function resolveLogoUrl(url) {
  if (!url) return null;
  if (url.startsWith('data:') || /^https?:\/\//i.test(url)) return url;
  return `${API_ORIGIN}${url.startsWith('/') ? '' : '/'}${url}`;
}

// Returns { data, format } usable by jsPDF.addImage, or null
function prepareLogo(rawUrl) {
  return new Promise((resolve) => {
    const url = resolveLogoUrl(rawUrl);
    if (!url) return resolve(null);

    const m = /^data:image\/(png|jpe?g);base64,/i.exec(url);
    if (m) {
      return resolve({ data: url, format: m[1].toLowerCase().startsWith('jp') ? 'JPEG' : 'PNG' });
    }

    const img = new Image();
    if (!url.startsWith('data:')) img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        canvas.getContext('2d').drawImage(img, 0, 0);
        resolve({ data: canvas.toDataURL('image/png'), format: 'PNG' });
      } catch (e) {
        console.warn('[PDF] Logo could not be read (CORS?):', e.message);
        resolve(null);
      }
    };
    img.onerror = () => {
      console.warn('[PDF] Logo failed to load:', url.slice(0, 100));
      resolve(null);
    };
    img.src = url;
  });
}

export async function downloadMarksPdf({ student, exam }) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 40;

  // Logo 
  let logo = null;
  try {
    const prepared = await prepareLogo(student.collegeLogo);
    if (prepared) {
      const props = doc.getImageProperties(prepared.data);
      logo = { ...prepared, width: props.width, height: props.height };
    } else {
      console.warn('[PDF] No logo prepared. collegeLogo =', String(student.collegeLogo).slice(0, 60));
    }
  } catch (e) {
    console.warn('[PDF] Logo error:', e.message);
  }

  // Header: logo followed by college name, centered together
  const name = student.collegeName || 'College';
  let fontSize = 22;
  doc.setFont('times', 'bold');
  doc.setFontSize(fontSize);

  const logoH = 38;
  const logoW = logo ? Math.min(logoH * (logo.width / logo.height), 90) : 0;
  const gap = logo ? 12 : 0;
  const maxTotal = W - 2 * M;

  while (logoW + gap + doc.getTextWidth(name) > maxTotal && fontSize > 12) {
    fontSize -= 1;
    doc.setFontSize(fontSize);
  }

  const total = logoW + gap + doc.getTextWidth(name);
  const startX = (W - total) / 2;

  if (logo) {
    try {
      doc.addImage(logo.data, logo.format, startX, 26, logoW, logoH);
    } catch (e) {
      console.warn('[PDF] addImage failed:', e.message);
    }
  }
  doc.setTextColor(...ACCENT);
  doc.text(name, startX + logoW + gap, 55);

  doc.setDrawColor(...ACCENT);
  doc.setLineWidth(2);
  doc.line(M, 72, W - M, 72);

  // Title
  doc.setTextColor(...DARK);
  doc.setFontSize(18);
  doc.text('INTERNAL MARKS STATEMENT', W / 2, 108, { align: 'center' });
  doc.setFontSize(12);
  doc.setTextColor(71, 85, 105);
  doc.text(`${exam.examTypeName} - Semester ${exam.semester}`, W / 2, 128, { align: 'center' });

  // Student details box
  const details = [
    ['Name', student.name],
    ['Roll Number', student.rollNumber],
    ['Department', student.department],
    ['Program', student.program],
    ['Batch', student.batchYear],
    ['Section', student.section || '-'],
  ];

  const boxTop = 148, rowH = 22, boxH = rowH * details.length + 16;
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(1);
  doc.roundedRect(M, boxTop, W - 2 * M, boxH, 6, 6);

  const labelX = M + 14;
  const valueX = M + 110;
  const maxValueW = W - M - 14 - valueX;

  details.forEach(([label, value], i) => {
    const y = boxTop + 24 + i * rowH;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    doc.text(`${label}:`, labelX, y);
    doc.setTextColor(...DARK);
    const text = String(value ?? '-');
    doc.text(doc.splitTextToSize(text, maxValueW)[0], valueX, y);
  });

  // Marks table
  const body = exam.rows.map((r, i) => {
    let mark = 'Not Published';
    if (r.published) {
      mark = r.isAbsent ? 'AB' : String(r.obtainedMarks ?? '-');
    }
    return [i + 1, r.code, r.name, r.maxMarks ?? '-', mark];
  });

  autoTable(doc, {
    startY: boxTop + boxH + 25,
    head: [['S.No', 'Course Code', 'Course Name', 'Max Marks', 'Obtained Marks']],
    body,
    theme: 'grid',
    headStyles: { fillColor: ACCENT, textColor: 255, halign: 'center' },
    styles: { fontSize: 10, cellPadding: 7, lineColor: [148, 163, 184], textColor: DARK },
    columnStyles: {
      0: { halign: 'center', cellWidth: 40 },
      1: { cellWidth: 80 },
      3: { halign: 'center', cellWidth: 75 },
      4: { halign: 'center', cellWidth: 95 },
    },
    margin: { left: M, right: M },
  });

  // Footer notes
  const y = doc.lastAutoTable.finalY + 30;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`Generated on ${new Date().toLocaleDateString('en-IN')}`, M, y);
  if (exam.rows.some((r) => !r.published)) {
    doc.text('Marks marked "Not Published" are not yet released.', M, y + 14);
  }

  // Signature block: section teacher name
  const sigW = 190;
  const sigX = W - M - sigW;
  let sigY = y + 70;
  if (sigY > H - 70) {
    doc.addPage();
    sigY = 110;
  }

  doc.setDrawColor(100, 116, 139);
  doc.setLineWidth(0.8);
  doc.line(sigX, sigY, sigX + sigW, sigY);

  const teacherName = student.sectionTeacher || '';
  if (teacherName) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...DARK);
    doc.text(doc.splitTextToSize(teacherName, sigW)[0], sigX + sigW / 2, sigY - 8, { align: 'center' });
  }
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text('Class Teacher', sigX + sigW / 2, sigY + 14, { align: 'center' });

  const safe = (s) => String(s || '').replace(/[^a-z0-9]+/gi, '_');
  doc.save(`${safe(exam.examTypeName)}_Sem${exam.semester}_${safe(student.name)}.pdf`);
}
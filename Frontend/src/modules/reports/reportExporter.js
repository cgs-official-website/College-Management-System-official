import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';

/**
 * Format string from camelCase / snake_case to Human-readable Title
 */
export const formatHeaderName = (key) => {
  if (!key) return '';
  // Check if already nicely spaced
  if (key.includes(' ')) return key;
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
};

/**
 * Clean & sanitize text for PDF stream (escape parentheses and backslashes)
 */
const sanitizePdfText = (text) => {
  if (text === null || text === undefined) return '';
  const str = String(text).replace(/[\r\n\t]+/g, ' ').trim();
  // Map non-ASCII currency/symbols to standard ASCII representations for Helvetica font
  const normalized = str
    .replace(/₹/g, 'Rs. ')
    .replace(/[^\x20-\x7E]/g, '?');
  return normalized
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
};

/**
 * 1. EXCEL EXPORT (.xlsx)
 */
export const exportToExcel = ({
  data = [],
  fileName = 'Report',
  sheetName = 'Report_Data',
  title = 'Institutional Report',
  metadata = {}
}) => {
  try {
    if (!data || data.length === 0) {
      toast.error('No data available to export.');
      return false;
    }

    // Build raw data with formatted keys if not already formatted
    const formattedData = data.map((row) => {
      const cleanRow = {};
      Object.keys(row).forEach((k) => {
        cleanRow[formatHeaderName(k)] = row[k] !== null && row[k] !== undefined ? row[k] : '';
      });
      return cleanRow;
    });

    const worksheet = XLSX.utils.json_to_sheet(formattedData);

    // Auto-calculate column widths
    const headers = Object.keys(formattedData[0]);
    const colWidths = headers.map((key) => {
      let maxLen = key.length;
      for (let i = 0; i < Math.min(formattedData.length, 100); i++) {
        const val = String(formattedData[i][key] || '');
        if (val.length > maxLen) maxLen = val.length;
      }
      return { wch: Math.min(Math.max(maxLen + 3, 10), 45) };
    });
    worksheet['!cols'] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31));

    const dateStr = new Date().toISOString().split('T')[0];
    const fullFileName = `${fileName.replace(/\s+/g, '_')}_${dateStr}.xlsx`;

    XLSX.writeFile(workbook, fullFileName);
    toast.success(`Exported Excel: ${fullFileName}`);
    return true;
  } catch (error) {
    console.error('[exportToExcel] Error:', error);
    toast.error('Failed to generate Excel file.');
    return false;
  }
};

/**
 * 2. CSV EXPORT (.csv) with UTF-8 BOM
 */
export const exportToCSV = ({
  data = [],
  fileName = 'Report',
  sheetName = 'Report_Data'
}) => {
  try {
    if (!data || data.length === 0) {
      toast.error('No data available to export.');
      return false;
    }

    const headers = Object.keys(data[0]);
    const displayHeaders = headers.map(formatHeaderName);
    const csvRows = [];

    // Header row
    csvRows.push(displayHeaders.map((h) => `"${h.replace(/"/g, '""')}"`).join(','));

    // Data rows
    for (const row of data) {
      const values = headers.map((h) => {
        const val = row[h] !== null && row[h] !== undefined ? row[h] : '';
        return `"${String(val).replace(/"/g, '""')}"`;
      });
      csvRows.push(values.join(','));
    }

    // UTF-8 BOM so Excel and spreadsheet apps render symbols & characters properly
    const csvContent = '\uFEFF' + csvRows.join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    const dateStr = new Date().toISOString().split('T')[0];
    const fullFileName = `${fileName.replace(/\s+/g, '_')}_${dateStr}.csv`;
    a.setAttribute('download', fullFileName);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);

    toast.success(`Exported CSV: ${fullFileName}`);
    return true;
  } catch (error) {
    console.error('[exportToCSV] Error:', error);
    toast.error('Failed to generate CSV file.');
    return false;
  }
};

/**
 * 3. PURE JS VECTOR PDF EXPORTER (.pdf)
 * Generates an authentic, fully compliant PDF 1.4 document with:
 * - A4 dimensions (Portrait or Landscape based on column count)
 * - College header & title banner
 * - Summary KPI metadata box
 * - Formatted tabular layout with zebra stripes & borders
 * - Multi-page pagination with repeated headers
 * - Page X of Y footers and timestamp
 */
export const exportToPDF = ({
  data = [],
  fileName = 'Report',
  title = 'Institutional Report',
  subtitle = '',
  summary = null,
  customColumns = null
}) => {
  try {
    if (!data || data.length === 0) {
      toast.error('No data available to export.');
      return false;
    }

    const rawHeaders = customColumns ? customColumns.map(c => c.key) : Object.keys(data[0]);
    const displayHeaders = customColumns ? customColumns.map(c => c.label) : rawHeaders.map(formatHeaderName);

    // Auto-select orientation: Landscape if > 5 columns, Portrait otherwise
    const isLandscape = rawHeaders.length > 5;
    const pageWidth = isLandscape ? 841.89 : 595.28;
    const pageHeight = isLandscape ? 595.28 : 841.89;

    const marginX = 36;
    const marginY = 36;
    const printableWidth = pageWidth - marginX * 2;
    const printableHeight = pageHeight - marginY * 2;

    // Calculate column widths proportional to content
    const colWeights = rawHeaders.map((key, idx) => {
      let maxLen = displayHeaders[idx].length;
      for (let i = 0; i < Math.min(data.length, 50); i++) {
        const l = String(data[i][key] || '').length;
        if (l > maxLen) maxLen = l;
      }
      return Math.min(Math.max(maxLen, 6), 28);
    });

    const totalWeight = colWeights.reduce((a, b) => a + b, 0);
    const colWidths = colWeights.map(w => (w / totalWeight) * printableWidth);

    // Row heights and paging constants
    const headerHeight = 22;
    const rowHeight = 18;
    const titleSectionHeight = summary ? 70 : 45;

    // Split data into pages
    const pages = [];
    let currentRows = [];
    let currentYBudget = printableHeight - titleSectionHeight - headerHeight - 30; // first page budget

    data.forEach((row) => {
      if (currentYBudget - rowHeight < 0) {
        pages.push(currentRows);
        currentRows = [row];
        currentYBudget = printableHeight - headerHeight - 30; // subsequent page budget
      } else {
        currentRows.push(row);
        currentYBudget -= rowHeight;
      }
    });
    if (currentRows.length > 0) {
      pages.push(currentRows);
    }

    const totalPages = pages.length;
    const generatedDateStr = new Date().toLocaleString();

    // Helper to truncate text to fit in a given point width (approx 5.1 pt per char in Helvetica 8pt)
    const fitText = (str, widthPt, fontSize = 8) => {
      const charWidth = fontSize * 0.52;
      const maxChars = Math.max(1, Math.floor(widthPt / charWidth));
      const s = String(str || '');
      if (s.length <= maxChars) return s;
      return s.slice(0, Math.max(0, maxChars - 2)) + '..';
    };

    // Build PDF content streams for each page
    const pageStreams = pages.map((pageRows, pageIdx) => {
      const isFirst = pageIdx === 0;
      let y = pageHeight - marginY;
      const ops = [];

      // 1. First Page Header
      if (isFirst) {
        // Navy blue top header bar
        ops.push(`0.08 0.12 0.22 rg`);
        ops.push(`${marginX} ${y - 28} ${printableWidth} 28 re f`);

        // Title text (white)
        ops.push(`BT /F2 12 Tf 1 1 1 rg`);
        ops.push(`${marginX + 12} ${y - 18} Td (${sanitizePdfText(title.toUpperCase())}) Tj ET`);

        // Institution subtext right aligned approx
        ops.push(`BT /F1 8 Tf 0.8 0.85 0.95 rg`);
        ops.push(`${pageWidth - marginX - 160} ${y - 17} Td (COLLEGE MANAGEMENT SYSTEM) Tj ET`);

        y -= 38;

        // Metadata / Date row
        ops.push(`BT /F1 8 Tf 0.4 0.45 0.55 rg`);
        ops.push(`${marginX} ${y} Td (Generated: ${sanitizePdfText(generatedDateStr)} | Records: ${data.length}) Tj ET`);

        // Summary KPI pill banner if present
        if (summary) {
          y -= 8;
          ops.push(`0.95 0.97 1.0 rg 0.75 0.8 0.9 RG 0.5 w`);
          ops.push(`${marginX} ${y - 18} ${printableWidth} 20 re B`);

          const summaryParts = Object.entries(summary)
            .map(([k, v]) => `${k}: ${v}`)
            .join('   |   ');

          ops.push(`BT /F2 8 Tf 0.12 0.25 0.5 rg`);
          ops.push(`${marginX + 10} ${y - 13} Td (${sanitizePdfText(fitText(summaryParts, printableWidth - 20, 8))}) Tj ET`);
          y -= 26;
        } else {
          y -= 14;
        }
      } else {
        // Subsequent page miniature header
        ops.push(`BT /F2 8 Tf 0.3 0.35 0.45 rg`);
        ops.push(`${marginX} ${y} Td (${sanitizePdfText(title)} (Continued)) Tj ET`);
        y -= 14;
      }

      // 2. Table Column Headers
      // Background bar
      ops.push(`0.15 0.22 0.35 rg`);
      ops.push(`${marginX} ${y - headerHeight} ${printableWidth} ${headerHeight} re f`);

      // Header Texts
      let currentX = marginX;
      displayHeaders.forEach((hText, colI) => {
        const colW = colWidths[colI];
        ops.push(`BT /F2 8 Tf 1 1 1 rg`);
        ops.push(`${currentX + 6} ${y - 14} Td (${sanitizePdfText(fitText(hText, colW - 10, 8))}) Tj ET`);
        currentX += colW;
      });

      y -= headerHeight;

      // 3. Table Rows
      pageRows.forEach((row, rowI) => {
        // Zebra striping
        if (rowI % 2 === 1) {
          ops.push(`0.96 0.97 0.985 rg`);
          ops.push(`${marginX} ${y - rowHeight} ${printableWidth} ${rowHeight} re f`);
        }

        // Bottom row border
        ops.push(`0.88 0.90 0.92 RG 0.5 w`);
        ops.push(`${marginX} ${y - rowHeight} m ${marginX + printableWidth} ${y - rowHeight} l S`);

        // Row cell texts
        let cellX = marginX;
        rawHeaders.forEach((k, colI) => {
          const colW = colWidths[colI];
          const rawVal = row[k] !== null && row[k] !== undefined ? String(row[k]) : '';
          const fitted = fitText(rawVal, colW - 10, 8);

          ops.push(`BT /F1 8 Tf 0.15 0.18 0.22 rg`);
          ops.push(`${cellX + 6} ${y - 12} Td (${sanitizePdfText(fitted)}) Tj ET`);
          cellX += colW;
        });

        y -= rowHeight;
      });

      // 4. Page Footer
      const footerY = marginY;
      // Divider line
      ops.push(`0.85 0.88 0.92 RG 0.5 w`);
      ops.push(`${marginX} ${footerY + 12} m ${marginX + printableWidth} ${footerY + 12} l S`);

      // Left footer: Institutional disclaimer
      ops.push(`BT /F1 7.5 Tf 0.5 0.55 0.6 rg`);
      ops.push(`${marginX} ${footerY + 2} Td (Official Institutional Record - College Management System) Tj ET`);

      // Right footer: Page X of Y
      const pageInfo = `Page ${pageIdx + 1} of ${totalPages}`;
      ops.push(`BT /F2 7.5 Tf 0.35 0.4 0.48 rg`);
      ops.push(`${pageWidth - marginX - 60} ${footerY + 2} Td (${pageInfo}) Tj ET`);

      return ops.join('\n');
    });

    // Assemble PDF Object Structure
    // 1: Catalog, 2: Pages, 3: Font-Regular, 4: Font-Bold
    // 5...(4+N): Page objects
    // (5+N)...(4+2N): Content stream objects
    let objCount = 4;
    const pageObjIds = [];
    const contentObjIds = [];

    for (let i = 0; i < totalPages; i++) {
      objCount++;
      pageObjIds.push(objCount);
    }
    for (let i = 0; i < totalPages; i++) {
      objCount++;
      contentObjIds.push(objCount);
    }

    const objects = [];

    // Obj 1: Catalog
    objects.push({
      id: 1,
      content: `<< /Type /Catalog /Pages 2 0 R >>`
    });

    // Obj 2: Pages
    objects.push({
      id: 2,
      content: `<< /Type /Pages /Kids [${pageObjIds.map(id => `${id} 0 R`).join(' ')}] /Count ${totalPages} >>`
    });

    // Obj 3: Helvetica (Regular)
    objects.push({
      id: 3,
      content: `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>`
    });

    // Obj 4: Helvetica-Bold
    objects.push({
      id: 4,
      content: `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>`
    });

    // Page Objects
    pageObjIds.forEach((pId, idx) => {
      const cId = contentObjIds[idx];
      objects.push({
        id: pId,
        content: `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth.toFixed(2)} ${pageHeight.toFixed(2)}] /Contents ${cId} 0 R /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> >>`
      });
    });

    // Content Stream Objects
    contentObjIds.forEach((cId, idx) => {
      const stream = pageStreams[idx];
      const encoder = new TextEncoder();
      const streamLength = encoder.encode(stream).length;
      objects.push({
        id: cId,
        content: `<< /Length ${streamLength} >>\nstream\n${stream}\nendstream`
      });
    });

    // Build raw PDF text with accurate xref table
    const encoder = new TextEncoder();
    let body = `%PDF-1.4\n%\xE2\xE3\xCF\xD3\n`;
    const offsets = [];

    objects.sort((a, b) => a.id - b.id).forEach((obj) => {
      const offset = encoder.encode(body).length;
      offsets[obj.id] = offset;
      body += `${obj.id} 0 obj\n${obj.content}\nendobj\n`;
    });

    const xrefOffset = encoder.encode(body).length;
    body += `xref\n0 ${objCount + 1}\n`;
    body += `0000000000 65535 f \n`;

    for (let id = 1; id <= objCount; id++) {
      const offStr = String(offsets[id]).padStart(10, '0');
      body += `${offStr} 00000 n \n`;
    }

    body += `trailer\n<< /Size ${objCount + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

    // Download PDF Blob
    const blob = new Blob([body], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    const dateStr = new Date().toISOString().split('T')[0];
    const fullFileName = `${fileName.replace(/\s+/g, '_')}_${dateStr}.pdf`;
    a.setAttribute('download', fullFileName);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);

    toast.success(`Exported PDF: ${fullFileName}`);
    return true;
  } catch (error) {
    console.error('[exportToPDF] Error:', error);
    toast.error('Failed to generate PDF document.');
    return false;
  }
};

/**
 * 4. PRINT / PDF PREVIEW
 * Opens a beautifully formatted print dialog where user can print directly or save as vector PDF
 */
export const openPrintReport = ({
  data = [],
  title = 'Institutional Report',
  subtitle = 'Official Analytics & Records',
  summary = null,
  customColumns = null
}) => {
  try {
    if (!data || data.length === 0) {
      toast.error('No data available to print.');
      return false;
    }

    const rawHeaders = customColumns ? customColumns.map(c => c.key) : Object.keys(data[0]);
    const displayHeaders = customColumns ? customColumns.map(c => c.label) : rawHeaders.map(formatHeaderName);

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Pop-up blocked. Please allow pop-ups for print preview.');
      return false;
    }

    const summaryCardsHtml = summary
      ? `
      <div class="summary-grid">
        ${Object.entries(summary)
          .map(
            ([label, val]) => `
          <div class="summary-card">
            <div class="summary-label">${label}</div>
            <div class="summary-value">${val}</div>
          </div>
        `
          )
          .join('')}
      </div>`
      : '';

    const tableRowsHtml = data
      .map(
        (row, idx) => `
        <tr class="${idx % 2 === 1 ? 'even' : ''}">
          <td style="width: 40px; text-align: center; color: #64748b;">${idx + 1}</td>
          ${rawHeaders
            .map((k) => `<td>${row[k] !== null && row[k] !== undefined ? String(row[k]) : '-'}</td>`)
            .join('')}
        </tr>`
      )
      .join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${title} - College Management System</title>
        <meta charset="utf-8" />
        <style>
          @page {
            size: A4 auto;
            margin: 12mm 15mm;
          }
          * {
            box-sizing: border-box;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          }
          body {
            color: #0f172a;
            margin: 0;
            padding: 20px;
            background: #fff;
            font-size: 11px;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #0284c7;
            padding-bottom: 12px;
            margin-bottom: 16px;
          }
          .title {
            font-size: 20px;
            font-weight: 800;
            color: #0f172a;
            margin: 0;
          }
          .subtitle {
            font-size: 11px;
            color: #64748b;
            margin-top: 4px;
          }
          .institution-badge {
            text-align: right;
            font-size: 10px;
            color: #475569;
          }
          .institution-name {
            font-size: 12px;
            font-weight: 700;
            color: #0284c7;
          }
          .summary-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
            gap: 10px;
            margin-bottom: 16px;
          }
          .summary-card {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 8px 12px;
          }
          .summary-label {
            font-size: 9px;
            font-weight: 600;
            text-transform: uppercase;
            color: #64748b;
            letter-spacing: 0.5px;
          }
          .summary-value {
            font-size: 16px;
            font-weight: 700;
            color: #0f172a;
            margin-top: 2px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
            font-size: 10px;
          }
          th {
            background-color: #0f172a;
            color: #ffffff;
            font-weight: 600;
            text-align: left;
            padding: 7px 9px;
            font-size: 9.5px;
            letter-spacing: 0.3px;
          }
          td {
            padding: 6px 9px;
            border-bottom: 1px solid #e2e8f0;
            color: #1e293b;
          }
          tr.even td {
            background-color: #f8fafc;
          }
          .footer {
            margin-top: 24px;
            border-top: 1px solid #cbd5e1;
            padding-top: 8px;
            display: flex;
            justify-content: space-between;
            font-size: 9px;
            color: #64748b;
          }
          @media print {
            body { padding: 0; }
            .no-print { display: none !important; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 class="title">${title}</h1>
            <div class="subtitle">${subtitle} • Generated on ${new Date().toLocaleString()}</div>
          </div>
          <div class="institution-badge">
            <div class="institution-name">COLLEGE MANAGEMENT SYSTEM</div>
            <div>Institutional Records & Analytics Portal</div>
          </div>
        </div>

        ${summaryCardsHtml}

        <table>
          <thead>
            <tr>
              <th style="width: 40px; text-align: center;">#</th>
              ${displayHeaders.map((h) => `<th>${h}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${tableRowsHtml}
          </tbody>
        </table>

        <div class="footer">
          <div>Official Record • Confidential • Generated for Authorized Personnel</div>
          <div>Total Records: ${data.length}</div>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    return true;
  } catch (error) {
    console.error('[openPrintReport] Error:', error);
    toast.error('Failed to open print preview.');
    return false;
  }
};

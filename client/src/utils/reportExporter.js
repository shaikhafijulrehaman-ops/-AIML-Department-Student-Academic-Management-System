/**
 * Institutional Report Exporter
 * DVR & Dr. HS MIC College of Technology
 * Department of Artificial Intelligence and Machine Learning (AIML)
 * 
 * Supports genuine client-side Excel (.xlsx) and PDF export for:
 * 1. Student Directory (Complete & Filtered)
 * 2. Update Tracking (Submitted & Pending)
 * 
 * Dynamically generates meaningful filenames and matching document titles based on:
 * - Target academic year
 * - Request title
 * - Submitted / Pending status
 * - Applied academic filters (SSC %, Inter %, CGPA, Location, Semester)
 */

import BRANDING from '../config/branding.js';

const INSTITUTION_HEADER = {
  collegeName: BRANDING.collegeName,
  departmentName: BRANDING.departmentName,
  departmentAbbr: BRANDING.departmentAbbr,
};

/**
 * Maps academic year string to full English word (e.g. '2nd Year' -> 'Second Year')
 */
export const formatYearToWords = (yearStr) => {
  if (!yearStr || yearStr === 'All') return '';
  if (yearStr.includes('2nd')) return 'Second Year';
  if (yearStr.includes('3rd')) return 'Third Year';
  if (yearStr.includes('4th')) return 'Fourth Year';
  return yearStr;
};

/**
 * Formats a comparison filter into a readable phrase
 */
export const formatComparisonPhrase = (label, op, v1, v2) => {
  if (!op || op === 'all' || !v1) return '';
  const n1 = parseFloat(v1);
  const n2 = parseFloat(v2);
  const isPercent = label.includes('SSC') || label.includes('Intermediate');
  const unit = isPercent ? ' Percent' : '';

  switch (op) {
    case 'gt':
      return `${label} Above ${n1}${unit}`;
    case 'lt':
      return `${label} Below ${n1}${unit}`;
    case 'eq':
      return `${label} Equal to ${n1}${unit}`;
    case 'between': {
      const lower = Math.min(n1, n2);
      const upper = Math.max(n1, n2);
      return `${label} Between ${lower} and ${upper}${unit}`;
    }
    default:
      return '';
  }
};

/**
 * Sanitizes a filename by removing invalid filesystem characters
 */
export const sanitizeFilename = (name) => {
  return (name || 'Report')
    .replace(/[/\\?%*:|"<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Dynamically generates a meaningful report filename and matching uppercase document title
 */
export const generateReportNaming = ({ type, request, activeRequest, appliedFilters }) => {
  const req = request || activeRequest;

  // 1. PENDING STUDENTS REPORT
  if (type === 'pending' || type === 'pending_tracking') {
    const yearWord = formatYearToWords(req?.targetYear) || 'Department';
    const reqTitle = req?.title ? req.title.trim() : '';
    let baseName = '';
    if (reqTitle) {
      baseName = `${yearWord} ${reqTitle} Not Complete List`;
    } else {
      baseName = `${yearWord} Task Not Complete List`;
    }
    const filename = sanitizeFilename(baseName);
    return {
      filename,
      title: filename.toUpperCase(),
      filtersDescription: req ? `Target: ${req.targetYear} • Semester: ${req.targetSemester} • Status: Pending Response` : 'Pending Response'
    };
  }

  // 2. SUBMITTED STUDENTS REPORT
  if (type === 'submitted' || type === 'submitted_tracking') {
    const yearWord = formatYearToWords(req?.targetYear) || 'Department';
    const reqTitle = req?.title ? req.title.trim() : '';
    let baseName = '';
    if (reqTitle) {
      baseName = `${yearWord} ${reqTitle} Completed List`;
    } else {
      baseName = `${yearWord} Task Completed List`;
    }
    const filename = sanitizeFilename(baseName);
    return {
      filename,
      title: filename.toUpperCase(),
      filtersDescription: req ? `Target: ${req.targetYear} • Semester: ${req.targetSemester} • Status: Completed & Verified` : 'Completed & Verified'
    };
  }

  // 3. COMPLETE STUDENT DIRECTORY
  if (type === 'complete_directory') {
    const filename = 'Complete Student Directory';
    return {
      filename,
      title: filename.toUpperCase(),
      filtersDescription: 'All AIML Department Students'
    };
  }

  // 4. FILTERED STUDENT DIRECTORY
  if (type === 'filtered_directory') {
    const parts = [];
    const metaParts = [];

    const yearWord = appliedFilters?.year && appliedFilters.year !== 'All' ? formatYearToWords(appliedFilters.year) : '';
    if (yearWord) {
      metaParts.push(`Year: ${appliedFilters.year}`);
    }

    if (appliedFilters?.semester && appliedFilters.semester !== 'All') {
      metaParts.push(`Semester: ${appliedFilters.semester}`);
    }

    if (appliedFilters?.location && appliedFilters.location !== 'All') {
      metaParts.push(`Location: ${appliedFilters.location}`);
    }

    // Comparison phrases
    const sscPhrase = formatComparisonPhrase('SSC', appliedFilters?.ssc?.op, appliedFilters?.ssc?.v1, appliedFilters?.ssc?.v2);
    if (sscPhrase) metaParts.push(sscPhrase);

    const interPhrase = formatComparisonPhrase('Intermediate', appliedFilters?.inter?.op, appliedFilters?.inter?.v1, appliedFilters?.inter?.v2);
    if (interPhrase) metaParts.push(interPhrase);

    const cgpaPhrase = formatComparisonPhrase('CGPA', appliedFilters?.cgpa?.op, appliedFilters?.cgpa?.v1, appliedFilters?.cgpa?.v2);
    if (cgpaPhrase) metaParts.push(cgpaPhrase);

    if (appliedFilters?.name) {
      metaParts.push(`Name matching "${appliedFilters.name}"`);
    }
    if (appliedFilters?.regNo) {
      metaParts.push(`RegNo matching "${appliedFilters.regNo}"`);
    }

    // Build human-readable filename
    const filterClauses = [];
    if (sscPhrase) filterClauses.push(sscPhrase);
    if (interPhrase) filterClauses.push(interPhrase);
    if (cgpaPhrase) filterClauses.push(cgpaPhrase);
    if (appliedFilters?.location && appliedFilters.location !== 'All') {
      filterClauses.push(`from ${appliedFilters.location}`);
    }
    if (appliedFilters?.semester && appliedFilters.semester !== 'All') {
      filterClauses.push(`Semester ${appliedFilters.semester}`);
    }

    let baseName = '';
    if (yearWord) {
      if (filterClauses.length > 0) {
        baseName = `${yearWord} Students with ${filterClauses.join(' and ')}`;
      } else {
        baseName = `${yearWord} Student Directory`;
      }
    } else {
      if (filterClauses.length > 0) {
        baseName = `Students with ${filterClauses.join(' and ')}`;
      } else {
        baseName = 'Filtered Student Directory';
      }
    }

    if (appliedFilters?.name) {
      baseName += ` Named ${appliedFilters.name}`;
    }
    if (appliedFilters?.regNo) {
      baseName += ` RegNo ${appliedFilters.regNo}`;
    }

    const filename = sanitizeFilename(baseName);
    return {
      filename,
      title: filename.toUpperCase(),
      filtersDescription: metaParts.join(' | ') || 'Filtered Records'
    };
  }

  return {
    filename: 'AIML_Academic_Report',
    title: 'AIML ACADEMIC REPORT',
    filtersDescription: ''
  };
};

/**
 * Downloads an Excel (.xlsx) file containing institutional letterhead and data table
 */
export const downloadExcelReport = ({ title, filename, filtersDescription, columns, data }) => {
  const currentDate = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const cleanFilename = sanitizeFilename(filename || 'AIML_Academic_Report');

  let tableHtml = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <!--[if gte mso 9]>
      <xml>
        <x:ExcelWorkbook>
          <x:ExcelWorksheets>
            <x:ExcelWorksheet>
              <x:Name>${cleanFilename.substring(0, 30)}</x:Name>
              <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
            </x:ExcelWorksheet>
          </x:ExcelWorksheets>
        </x:ExcelWorkbook>
      </xml>
      <![endif]-->
      <meta http-equiv="content-type" content="application/vnd.ms-excel; charset=UTF-8">
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; }
        .institution-title { font-size: 16pt; font-weight: bold; color: #4A192B; text-align: center; }
        .department-title { font-size: 12pt; font-weight: bold; color: #FF6B1A; text-align: center; }
        .report-title { font-size: 13pt; font-weight: bold; text-align: center; padding: 6px; }
        .meta-line { font-size: 9pt; color: #555; text-align: center; }
        th { background-color: #4A192B; color: #ffffff; font-weight: bold; padding: 8px; border: 1px solid #35101E; font-size: 10pt; text-transform: uppercase; }
        td { padding: 6px; border: 1px solid #dcdcdc; font-size: 9pt; }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        tr:nth-child(even) { background-color: #f9fafb; }
      </style>
    </head>
    <body>
      <table>
        <tr><td colspan="${columns.length}" class="institution-title">${INSTITUTION_HEADER.collegeName}</td></tr>
        <tr><td colspan="${columns.length}" class="department-title">${INSTITUTION_HEADER.departmentName} (${INSTITUTION_HEADER.departmentAbbr})</td></tr>
        <tr><td colspan="${columns.length}" class="report-title">${title}</td></tr>
        <tr><td colspan="${columns.length}" class="meta-line">Generated on: ${currentDate} | Total Records: ${data.length} ${filtersDescription ? '| ' + filtersDescription : ''}</td></tr>
        <tr><td colspan="${columns.length}"></td></tr>
        <thead>
          <tr>
            ${columns.map(col => `<th>${col.header}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${data.map(row => `
            <tr>
              ${columns.map(col => {
                const val = typeof col.accessor === 'function' ? col.accessor(row) : row[col.accessor];
                const alignClass = col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : '';
                return `<td class="${alignClass}">${val !== undefined && val !== null ? val : '—'}</td>`;
              }).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
    </body>
    </html>
  `;

  const blob = new Blob(['\uFEFF' + tableHtml], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = cleanFilename.endsWith('.xlsx') ? cleanFilename : `${cleanFilename}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/**
 * Generates an institutional print/PDF report window ready for immediate download/saving as PDF
 */
export const downloadPdfReport = ({ title, filename, filtersDescription, columns, data }) => {
  const currentDate = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const cleanFilename = sanitizeFilename(filename || 'AIML_Academic_Report');

  const printContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${cleanFilename}</title>
      <style>
        @page { size: A4 landscape; margin: 12mm; }
        body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; margin: 0; padding: 20px; }
        .header { text-align: center; border-bottom: 2px solid #4A192B; padding-bottom: 12px; margin-bottom: 16px; }
        .college { font-size: 18px; font-weight: 800; color: #4A192B; text-transform: uppercase; letter-spacing: 0.5px; }
        .dept { font-size: 13px; font-weight: 700; color: #FF6B1A; margin-top: 4px; }
        .report-title { font-size: 15px; font-weight: 800; color: #0f172a; margin-top: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
        .meta { font-size: 10px; color: #64748b; margin-top: 4px; }
        table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 11px; }
        th { background-color: #4A192B; color: #ffffff; padding: 8px 6px; text-align: left; border: 1px solid #35101E; font-weight: 700; font-size: 10px; text-transform: uppercase; }
        td { padding: 6px; border: 1px solid #cbd5e1; font-size: 10px; }
        tr:nth-child(even) { background-color: #f8fafc; }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .footer { margin-top: 20px; font-size: 9px; color: #94a3b8; display: flex; justify-content: space-between; border-top: 1px solid #e2e8f0; padding-top: 8px; }
        @media print {
          body { padding: 0; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="college">${INSTITUTION_HEADER.collegeName}</div>
        <div class="dept">${INSTITUTION_HEADER.departmentName} (${INSTITUTION_HEADER.departmentAbbr})</div>
        <div class="report-title">${title}</div>
        <div class="meta">Generated: ${currentDate} | Total Records: ${data.length} ${filtersDescription ? '| ' + filtersDescription : ''}</div>
      </div>
      <table>
        <thead>
          <tr>
            ${columns.map(col => `<th class="${col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : ''}">${col.header}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${data.map((row) => `
            <tr>
              ${columns.map(col => {
                const val = typeof col.accessor === 'function' ? col.accessor(row) : row[col.accessor];
                const alignClass = col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : '';
                return `<td class="${alignClass}">${val !== undefined && val !== null ? val : '—'}</td>`;
              }).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
      <div class="footer">
        <span>DVR &amp; Dr. HS MIC College of Technology &bull; Confidential Academic Record</span>
        <span>Department of Artificial Intelligence &amp; Machine Learning</span>
      </div>
      <script>
        window.onload = function() {
          window.print();
        };
      </script>
    </body>
    </html>
  `;

  // Attempt popup window first
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(printContent);
    printWindow.document.close();
  } else {
    // Fallback: If popups are blocked by browser/sandbox, download printable report directly
    const blob = new Blob([printContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = cleanFilename.endsWith('.pdf') ? cleanFilename : `${cleanFilename}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
};


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

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
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
 * Downloads a genuine Excel (.xlsx) OpenXML workbook containing institutional letterhead and data table
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
  const finalFilename = cleanFilename.endsWith('.xlsx') ? cleanFilename : `${cleanFilename}.xlsx`;

  // 1. Create a real XLSX workbook using SheetJS
  const wb = XLSX.utils.book_new();

  // 2. Build rows with institutional letterhead
  const wsData = [
    [INSTITUTION_HEADER.collegeName],
    [`${INSTITUTION_HEADER.departmentName} (${INSTITUTION_HEADER.departmentAbbr})`],
    [title.toUpperCase()],
    [`Generated on: ${currentDate} | Total Records: ${data.length}${filtersDescription ? ' | ' + filtersDescription : ''}`],
    [], // Blank separator row
    columns.map(c => c.header), // Table header row
    ...data.map(row =>
      columns.map(col => {
        const val = typeof col.accessor === 'function' ? col.accessor(row) : row[col.accessor];
        return val !== undefined && val !== null ? val : '—';
      })
    )
  ];

  // 3. Create worksheet from array-of-arrays
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // 4. Calculate sensible column widths
  const colWidths = columns.map(col => {
    let maxLen = col.header.length;
    data.forEach(row => {
      const val = typeof col.accessor === 'function' ? col.accessor(row) : row[col.accessor];
      const strVal = val !== undefined && val !== null ? String(val) : '';
      if (strVal.length > maxLen) maxLen = strVal.length;
    });
    return { wch: Math.min(Math.max(maxLen + 3, 12), 40) };
  });
  ws['!cols'] = colWidths;

  // 5. Append worksheet to workbook
  const sheetName = cleanFilename.substring(0, 28).replace(/[\\/?*[\]]/g, '') || 'Report';
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  // 6. Write workbook as real XLSX binary buffer and trigger actual device download
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = finalFilename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

/**
 * Generates and downloads a genuine binary PDF file (.pdf) with landscape A4 institutional letterhead
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
  const finalFilename = cleanFilename.endsWith('.pdf') ? cleanFilename : `${cleanFilename}.pdf`;

  // 1. Initialize Landscape A4 jsPDF instance
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();

  // 2. Official Institutional Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(74, 25, 43); // Claret Wine #4A192B
  doc.text(INSTITUTION_HEADER.collegeName, pageWidth / 2, 14, { align: 'center' });

  doc.setFontSize(10.5);
  doc.setTextColor(255, 107, 26); // Tangerine Flash #FF6B1A
  doc.text(`${INSTITUTION_HEADER.departmentName} (${INSTITUTION_HEADER.departmentAbbr})`, pageWidth / 2, 20, { align: 'center' });

  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42); // Slate 900
  doc.text(title.toUpperCase(), pageWidth / 2, 27, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139); // Slate 500
  const metaText = `Generated on: ${currentDate} | Total Records: ${data.length}${filtersDescription ? ' | ' + filtersDescription : ''}`;
  doc.text(metaText, pageWidth / 2, 32, { align: 'center' });

  // Draw separator line below header
  doc.setDrawColor(74, 25, 43);
  doc.setLineWidth(0.5);
  doc.line(14, 34, pageWidth - 14, 34);

  // 3. Format table columns and rows
  const tableHeaders = columns.map(c => c.header);
  const tableRows = data.map(row =>
    columns.map(col => {
      const val = typeof col.accessor === 'function' ? col.accessor(row) : row[col.accessor];
      return val !== undefined && val !== null ? String(val) : '—';
    })
  );

  // Determine column alignment styles
  const columnStyles = {};
  columns.forEach((col, idx) => {
    if (col.align === 'center') {
      columnStyles[idx] = { halign: 'center' };
    } else if (col.align === 'right') {
      columnStyles[idx] = { halign: 'right' };
    } else {
      columnStyles[idx] = { halign: 'left' };
    }
  });

  // 4. Generate table using autoTable
  const runAutoTable = autoTable.default || autoTable;
  runAutoTable(doc, {
    head: [tableHeaders],
    body: tableRows,
    startY: 37,
    margin: { left: 14, right: 14, bottom: 15 },
    theme: 'grid',
    headStyles: {
      fillColor: [74, 25, 43], // #4A192B Claret Wine
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
      halign: 'center',
      cellPadding: 2.5
    },
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: 2,
      lineColor: [226, 232, 240],
      lineWidth: 0.1
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252] // Slate 50
    },
    columnStyles,
    didDrawPage: (dataObj) => {
      // Institutional Footer on each page
      const pageCount = doc.internal.getNumberOfPages();
      const pageHeight = doc.internal.pageSize.getHeight();
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184); // Slate 400
      doc.setFont('helvetica', 'normal');

      doc.text(
        'DVR & Dr. HS MIC College of Technology • Confidential Academic Record • Department of AIML',
        14,
        pageHeight - 8
      );
      doc.text(
        `Page ${dataObj.pageNumber} of ${pageCount}`,
        pageWidth - 14,
        pageHeight - 8,
        { align: 'right' }
      );
    }
  });

  // 5. Trigger direct device download via Blob & ObjectURL
  const pdfBlob = doc.output('blob');
  const url = URL.createObjectURL(pdfBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = finalFilename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};


/**
 * Academic Year and Batch Mapping Utilities
 * DVR & Dr. HS MIC College of Technology - AIML Department
 *
 * Official Mapping:
 * - 2nd Year (Stored current_year = 2) -> 2025 Batch
 * - 3rd Year (Stored current_year = 3) -> 2024 Batch
 * - 4th Year (Stored current_year = 4) -> 2023 Batch
 */

export const ACADEMIC_YEAR_TO_BATCH = Object.freeze({
  1: '2026 Batch',
  2: '2025 Batch',
  3: '2024 Batch',
  4: '2023 Batch'
});

export const BATCH_YEAR_NUMBERS = Object.freeze({
  1: 2026,
  2: 2025,
  3: 2024,
  4: 2023
});

/**
 * Normalizes an academic year value (number, string like "Year 3", "3rd Year", 3) into an integer (2, 3, 4).
 */
export const normalizeAcademicYear = (year) => {
  if (typeof year === 'number' && !isNaN(year)) return year;
  const parsed = parseInt(String(year || '').replace(/\D/g, ''), 10);
  return !isNaN(parsed) && parsed >= 1 && parsed <= 4 ? parsed : null;
};

/**
 * Returns the batch display string (e.g. "2024 Batch") for an academic year.
 */
export const getBatchLabel = (year) => {
  const norm = normalizeAcademicYear(year);
  return norm && ACADEMIC_YEAR_TO_BATCH[norm] ? ACADEMIC_YEAR_TO_BATCH[norm] : 'Academic Batch Pending';
};

/**
 * Returns canonical academic year string (e.g. "3rd Year").
 */
export const getAcademicYearDisplay = (year) => {
  const norm = normalizeAcademicYear(year);
  if (norm === 1) return '1st Year';
  if (norm === 2) return '2nd Year';
  if (norm === 3) return '3rd Year';
  if (norm === 4) return '4th Year';
  return 'Year Pending';
};

/**
 * Returns canonical term string (e.g. "Term 3-1" or "3-1").
 */
export const getTermDisplay = (year, term) => {
  const normYear = normalizeAcademicYear(year);
  let termNum = typeof term === 'number' ? term : parseInt(String(term || '').replace(/\D/g, ''), 10);
  if (isNaN(termNum) || termNum < 1 || termNum > 2) termNum = 1;
  if (!normYear) return 'Term Pending';
  return `${normYear}-${termNum}`;
};

/**
 * Calculates maximum completed semester eligible for CGPA reporting.
 * Based on institutional standing:
 * - 2-1 student: completed Sem 1, Sem 2 (up to Sem 2 completed)
 * - 2-2 student: completed Sem 1, Sem 2, Sem 3 (up to Sem 3 completed)
 * - 3-1 student: completed Sem 1, Sem 2, Sem 3, Sem 4 (up to Sem 4 completed)
 * - 3-2 student: completed Sem 1..5 (up to Sem 5 completed)
 * - 4-1 student: completed Sem 1..6 (up to Sem 6 completed)
 * - 4-2 student: completed Sem 1..7 (up to Sem 7 completed)
 */
export const getMaxCompletedSemesters = (year, term) => {
  const normYear = normalizeAcademicYear(year);
  if (!normYear || normYear < 2) return 0;

  let termNum = 1;
  if (typeof term === 'number') {
    termNum = term;
  } else if (typeof term === 'string') {
    const s = term.trim();
    if (s.includes('-')) {
      termNum = parseInt(s.split('-')[1], 10) || 1;
    } else {
      termNum = parseInt(s.replace(/\D/g, ''), 10) || 1;
    }
  }

  // Formula: ((year - 1) * 2) + term - 1
  return ((normYear - 1) * 2) + termNum - 1;
};

/**
 * Centralized Academic Status and CGPA Consistency Utility
 * AIML Department Student Academic Management System
 * DVR & Dr. HS MIC College of Technology
 *
 * Provides a single source of truth for:
 * 1. Semester eligibility calculations
 * 2. CGPA display formatting (strictly numeric or "Not Provided", NEVER "Pending")
 * 3. Update status determination (Submitted, Pending Submission, No Active Request, Not Eligible)
 * 4. Latest CGPA and latest completed semester calculation
 * 5. Campaign submission matching across Student and HOD portals
 */

import {
  normalizeAcademicYear,
  getBatchLabel,
  getAcademicYearDisplay,
  getTermDisplay,
  getMaxCompletedSemesters
} from './academicYearMapping.js';

export {
  normalizeAcademicYear,
  getBatchLabel,
  getAcademicYearDisplay,
  getTermDisplay,
  getMaxCompletedSemesters
};

/**
 * Standard 8 semester metadata for B.Tech AIML program.
 */
export const ALL_SEMESTER_CONFIG = Object.freeze([
  { semNumber: 1, term: '1-1', title: '1st Year I Semester', year: '1st Year' },
  { semNumber: 2, term: '1-2', title: '1st Year II Semester', year: '1st Year' },
  { semNumber: 3, term: '2-1', title: '2nd Year I Semester', year: '2nd Year' },
  { semNumber: 4, term: '2-2', title: '2nd Year II Semester', year: '2nd Year' },
  { semNumber: 5, term: '3-1', title: '3rd Year I Semester', year: '3rd Year' },
  { semNumber: 6, term: '3-2', title: '3rd Year II Semester', year: '3rd Year' },
  { semNumber: 7, term: '4-1', title: '4th Year I Semester', year: '4th Year' },
  { semNumber: 8, term: '4-2', title: '4th Year II Semester', year: '4th Year' },
]);

/**
 * Calculates max completed semester based on student standing.
 * Formula: ((current_year - 1) * 2) + current_term - 1
 */
export const getStudentMaxCompletedSem = (student) => {
  if (!student) return 0;
  const yearNum = student.currentYear ?? student.current_year ?? parseInt(String(student.year || '').replace(/\D/g, ''), 10);
  let termNum = student.currentTerm ?? student.current_term;
  if (!termNum && student.term) {
    const s = String(student.term).trim();
    termNum = s.includes('-') ? parseInt(s.split('-')[1], 10) : parseInt(s.replace(/\D/g, ''), 10);
  }
  return getMaxCompletedSemesters(yearNum, termNum || 1);
};

/**
 * Normalizes semester number from arbitrary string or number (e.g. 3, "3", "Semester 3", "2-1").
 */
export const parseSemesterNumber = (val) => {
  if (typeof val === 'number' && !isNaN(val)) return val;
  if (!val) return null;
  const s = String(val).trim();
  if (s.includes('-')) {
    const parts = s.split('-');
    const y = parseInt(parts[0], 10);
    const t = parseInt(parts[1], 10);
    if (!isNaN(y) && !isNaN(t)) return ((y - 1) * 2) + t;
  }
  const match = s.match(/\d+/);
  return match ? parseInt(match[0], 10) : null;
};

/**
 * Retrieves a student's saved semester record for a specific semester number.
 */
export const findStudentSemesterRecord = (student, semNumber) => {
  if (!student) return null;
  const records = student.semesterRecords || student.aiml_semester_records || [];
  return records.find((r) => {
    const rSem = r.semesterNumber ?? r.semNumber ?? r.semester_number ?? parseSemesterNumber(r.term);
    return rSem === semNumber;
  }) || null;
};

/**
 * Computes CGPA display value for a semester.
 *
 * Rules:
 * - Ongoing/future (ineligible): display "—"
 * - Eligible and saved numeric CGPA exists (> 0): display formatted numeric (e.g. "7.85")
 * - Eligible but no database record exists: display "Not Provided"
 * - NEVER returns "Pending" as CGPA
 */
export const getSemesterCgpaDisplay = (student, semNumber) => {
  const maxCompletedSem = getStudentMaxCompletedSem(student);
  const isEligible = maxCompletedSem > 0 && semNumber <= maxCompletedSem;

  if (!isEligible) {
    return {
      display: '—',
      isEligible: false,
      numericCgpa: null,
      badgeClass: 'text-slate-400 font-mono'
    };
  }

  const record = findStudentSemesterRecord(student, semNumber);
  const rawCgpa = record?.cgpa ?? record?.cumulative_cgpa;
  const numCgpa = rawCgpa !== null && rawCgpa !== undefined && rawCgpa !== '' ? Number(rawCgpa) : null;

  if (numCgpa !== null && !isNaN(numCgpa) && numCgpa > 0) {
    return {
      display: numCgpa.toFixed(2),
      isEligible: true,
      numericCgpa: numCgpa,
      badgeClass: 'px-2.5 py-0.5 rounded-lg bg-emerald-100 text-emerald-900 font-extrabold font-mono text-xs shadow-xs'
    };
  }

  return {
    display: 'Not Provided',
    isEligible: true,
    numericCgpa: null,
    badgeClass: 'text-slate-400 font-mono italic text-xs'
  };
};

/**
 * Determines semester update status based on:
 * 1. Semester eligibility (maxCompletedSem)
 * 2. Saved CGPA existence in database
 * 3. Active matching campaign availability
 *
 * Return values:
 * - "Submitted": Matching CGPA exists and campaign assignment is submitted / record saved
 * - "Pending Submission": Active matching campaign exists, but required CGPA not yet saved
 * - "No Active Request": Eligible semester, but no applicable active campaign exists
 * - "Not Eligible": Semester is ongoing or in the future
 */
export const getSemesterUpdateStatus = (student, semNumber, campaigns = []) => {
  const maxCompletedSem = getStudentMaxCompletedSem(student);
  const isEligible = maxCompletedSem > 0 && semNumber <= maxCompletedSem;

  if (!isEligible) {
    return {
      status: 'Not Eligible',
      badgeClass: 'bg-slate-100 text-slate-500 border-slate-200'
    };
  }

  const record = findStudentSemesterRecord(student, semNumber);
  const rawCgpa = record?.cgpa ?? record?.cumulative_cgpa;
  const hasCgpa = rawCgpa !== null && rawCgpa !== undefined && rawCgpa !== '' && !isNaN(Number(rawCgpa)) && Number(rawCgpa) > 0;

  if (hasCgpa) {
    return {
      status: 'Submitted',
      badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-300 font-bold'
    };
  }

  // Check if an active matching campaign exists for this semester
  const studentYearNum = student.currentYear ?? student.current_year ?? parseInt(String(student.year || '').replace(/\D/g, ''), 10);
  const hasActiveCampaign = campaigns.some((c) => {
    const isActive = c.is_active ?? c.isActive ?? (c.status === 'Active');
    if (!isActive) return false;

    const cSem = c.target_semester ?? c.targetSemNum ?? parseSemesterNumber(c.targetSemester);
    if (cSem !== semNumber) return false;

    if (c.target_year || c.targetYearNum || c.targetYear) {
      const cYear = c.target_year ?? c.targetYearNum ?? parseInt(String(c.targetYear).replace(/\D/g, ''), 10);
      if (studentYearNum && cYear && cYear !== studentYearNum) return false;
    }

    return true;
  });

  if (hasActiveCampaign) {
    return {
      status: 'Pending Submission',
      badgeClass: 'bg-amber-50 text-amber-800 border-amber-300 font-bold'
    };
  }

  return {
    status: 'No Active Request',
    badgeClass: 'bg-slate-100 text-slate-600 border-slate-200 font-medium'
  };
};

/**
 * Computes latest completed semester and latest CGPA for a student.
 * Uses the highest completed eligible semester where a valid numeric CGPA was saved.
 *
 * Returns:
 * - If records exist: { latestSemester: 3, latestCgpa: 8.10, displaySemester: 'Sem 3', displayCgpa: '8.10', updatedAt }
 * - If no records exist: { latestSemester: null, latestCgpa: null, displaySemester: 'Not Provided', displayCgpa: 'Not Provided', updatedAt: null }
 */
export const getStudentLatestAcademics = (student) => {
  if (!student) {
    return {
      latestSemester: null,
      latestSemesterNumber: null,
      latestCgpa: null,
      displaySemester: 'Not Provided',
      displayCgpa: 'Not Provided',
      updatedAt: null
    };
  }

  const maxCompletedSem = getStudentMaxCompletedSem(student);
  const records = student.semesterRecords || student.aiml_semester_records || [];

  const eligibleCompletedRecords = records
    .map((r) => {
      const semNum = r.semesterNumber ?? r.semNumber ?? r.semester_number ?? parseSemesterNumber(r.term);
      const rawCgpa = r.cgpa ?? r.cumulative_cgpa;
      const numCgpa = rawCgpa !== null && rawCgpa !== undefined && rawCgpa !== '' ? Number(rawCgpa) : null;
      return {
        semNum,
        cgpa: numCgpa,
        updatedAt: r.updated_at || r.updatedAt || r.submitted_at || r.submittedAt || null
      };
    })
    .filter((r) => r.semNum && r.semNum <= maxCompletedSem && r.cgpa !== null && !isNaN(r.cgpa) && r.cgpa > 0)
    .sort((a, b) => a.semNum - b.semNum);

  if (eligibleCompletedRecords.length === 0) {
    return {
      latestSemester: null,
      latestSemesterNumber: null,
      latestCgpa: null,
      displaySemester: 'Not Provided',
      displayCgpa: 'Not Provided',
      updatedAt: null
    };
  }

  const latest = eligibleCompletedRecords[eligibleCompletedRecords.length - 1];
  return {
    latestSemester: latest.semNum,
    latestSemesterNumber: latest.semNum,
    latestCgpa: latest.cgpa,
    displaySemester: `Sem ${latest.semNum}`,
    displayCgpa: latest.cgpa.toFixed(2),
    updatedAt: latest.updatedAt
  };
};

/**
 * Checks whether a student has submitted a valid CGPA for a given campaign/update request.
 */
export const isStudentSubmittedForCampaign = (student, campaign) => {
  if (!student || !campaign) return false;

  const targetSem = campaign.target_semester ?? campaign.targetSemNum ?? parseSemesterNumber(campaign.targetSemester);
  if (!targetSem) return false;

  const record = findStudentSemesterRecord(student, targetSem);
  if (!record) return false;

  const rawCgpa = record.cgpa ?? record.cumulative_cgpa;
  return rawCgpa !== null && rawCgpa !== undefined && rawCgpa !== '' && !isNaN(Number(rawCgpa)) && Number(rawCgpa) > 0;
};

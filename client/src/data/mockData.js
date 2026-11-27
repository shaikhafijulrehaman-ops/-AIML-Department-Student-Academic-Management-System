/**
 * Official AIML Department Demo Dataset
 * DVR & Dr. HS MIC College of Technology
 * Department of Artificial Intelligence and Machine Learning (AIML)
 * 
 * STRICT DEMO SPECIFICATION:
 * All records are strictly illustrative demo student records during this UI Phase.
 * Note: Only CGPA is tracked as the academic grade point across all semesters.
 */

// Semester definitions helper
export const ALL_SEMESTER_TERMS = [
  { term: '1-1', semNumber: 1, title: 'Semester 1-1', year: '1st Year' },
  { term: '1-2', semNumber: 2, title: 'Semester 1-2', year: '1st Year' },
  { term: '2-1', semNumber: 3, title: 'Semester 2-1', year: '2nd Year' },
  { term: '2-2', semNumber: 4, title: 'Semester 2-2', year: '2nd Year' },
  { term: '3-1', semNumber: 5, title: 'Semester 3-1', year: '3rd Year' },
  { term: '3-2', semNumber: 6, title: 'Semester 3-2', year: '3rd Year' },
  { term: '4-1', semNumber: 7, title: 'Semester 4-1', year: '4th Year' },
  { term: '4-2', semNumber: 8, title: 'Semester 4-2', year: '4th Year' },
];

/**
 * Strict Year-to-Term mapping:
 * - Second Year: 2-1, 2-2
 * - Third Year: 3-1, 3-2
 * - Fourth Year: 4-1, 4-2
 */
export const YEAR_ALLOWED_TERMS = {
  '2nd Year': ['2-1', '2-2'],
  '3rd Year': ['3-1', '3-2'],
  '4th Year': ['4-1', '4-2'],
  'Second Year': ['2-1', '2-2'],
  'Third Year': ['3-1', '3-2'],
  'Fourth Year': ['4-1', '4-2'],
};

export const getTermsForYear = (year) => {
  if (!year) return [];
  if (year.includes('2') || year.toLowerCase().includes('second')) return ['2-1', '2-2'];
  if (year.includes('3') || year.toLowerCase().includes('third')) return ['3-1', '3-2'];
  if (year.includes('4') || year.toLowerCase().includes('fourth')) return ['4-1', '4-2'];
  return [];
};

/**
 * Returns max completed semester number based on term:
 * - 2-1 students: up to Sem 3 (2-1)
 * - 2-2 students: up to Sem 4 (2-2)
 * - 3-1 students: up to Sem 5 (3-1)
 * - 3-2 students: up to Sem 6 (3-2)
 * - 4-1 students: up to Sem 7 (4-1)
 * - 4-2 students: up to Sem 8 (4-2)
 */
/**
 * Maximum completed semester mapping:
 * Formula: ((year - 1) * 2) + term - 1
 * - 2-1 students: up to Sem 2 (1-2 completed)
 * - 2-2 students: up to Sem 3 (2-1 completed)
 * - 3-1 students: up to Sem 4 (2-2 completed)
 * - 3-2 students: up to Sem 5 (3-1 completed)
 * - 4-1 students: up to Sem 6 (3-2 completed)
 * - 4-2 students: up to Sem 7 (4-1 completed)
 */
export const getMaxCompletedSemForTerm = (term) => {
  if (!term) return 0;
  const s = String(term).trim();
  switch (s) {
    case '2-1': return 2;
    case '2-2': return 3;
    case '3-1': return 4;
    case '3-2': return 5;
    case '4-1': return 6;
    case '4-2': return 7;
    default: {
      const parts = s.split('-');
      if (parts.length === 2) {
        const y = parseInt(parts[0], 10);
        const t = parseInt(parts[1], 10);
        if (!isNaN(y) && !isNaN(t) && y >= 2 && y <= 4 && (t === 1 || t === 2)) {
          return ((y - 1) * 2) + t - 1;
        }
      }
      return 0;
    }
  }
};

export const INITIAL_STUDENTS = [
  // 3rd Year (3-1) Students
  {
    id: 'std_1',
    name: 'K. Sai Krishna',
    registerNumber: '22H71A6125',
    profilePhoto: null,
    email: 'saikrishna.22aiml@mictech.ac.in',
    phone: '+91 98765 43210',
    location: 'Vijayawada',
    year: '3rd Year',
    term: '3-1',
    sscPercentage: 92.4,
    interType: 'Intermediate',
    interPercentage: 94.2,
    semesterRecords: [
      { term: '1-1', semNumber: 1, cgpa: 8.50, status: 'Updated' },
      { term: '1-2', semNumber: 2, cgpa: 8.60, status: 'Updated' },
      { term: '2-1', semNumber: 3, cgpa: 8.70, status: 'Updated' },
      { term: '2-2', semNumber: 4, cgpa: 8.68, status: 'Updated' },
      { term: '3-1', semNumber: 5, cgpa: null, status: 'Ongoing' },
      { term: '3-2', semNumber: 6, cgpa: null, status: 'Upcoming' },
      { term: '4-1', semNumber: 7, cgpa: null, status: 'Upcoming' },
      { term: '4-2', semNumber: 8, cgpa: null, status: 'Upcoming' },
    ]
  },
  {
    id: 'std_2',
    name: 'M. Harshavardhan Reddy',
    registerNumber: '22H71A6134',
    profilePhoto: null,
    email: 'harsha.22aiml@mictech.ac.in',
    phone: '+91 98451 23456',
    location: 'Guntur',
    year: '3rd Year',
    term: '3-1',
    sscPercentage: 89.6,
    interType: 'Intermediate',
    interPercentage: 91.0,
    semesterRecords: [
      { term: '1-1', semNumber: 1, cgpa: 8.20, status: 'Updated' },
      { term: '1-2', semNumber: 2, cgpa: 8.30, status: 'Updated' },
      { term: '2-1', semNumber: 3, cgpa: 8.30, status: 'Updated' },
      { term: '2-2', semNumber: 4, cgpa: 8.31, status: 'Updated' },
      { term: '3-1', semNumber: 5, cgpa: null, status: 'Ongoing' },
      { term: '3-2', semNumber: 6, cgpa: null, status: 'Upcoming' },
      { term: '4-1', semNumber: 7, cgpa: null, status: 'Upcoming' },
      { term: '4-2', semNumber: 8, cgpa: null, status: 'Upcoming' },
    ]
  },
  {
    id: 'std_3',
    name: 'P. Ananya Lakshmi',
    registerNumber: '22H71A6145',
    profilePhoto: null,
    email: 'ananya.22aiml@mictech.ac.in',
    phone: '+91 97001 54321',
    location: 'Kanchikacherla',
    year: '3rd Year',
    term: '3-1',
    sscPercentage: 95.8,
    interType: 'Intermediate',
    interPercentage: 96.5,
    semesterRecords: [
      { term: '1-1', semNumber: 1, cgpa: 9.10, status: 'Updated' },
      { term: '1-2', semNumber: 2, cgpa: 9.20, status: 'Updated' },
      { term: '2-1', semNumber: 3, cgpa: 9.20, status: 'Updated' },
      { term: '2-2', semNumber: 4, cgpa: 9.21, status: 'Updated' },
      { term: '3-1', semNumber: 5, cgpa: null, status: 'Ongoing' },
      { term: '3-2', semNumber: 6, cgpa: null, status: 'Upcoming' },
      { term: '4-1', semNumber: 7, cgpa: null, status: 'Upcoming' },
      { term: '4-2', semNumber: 8, cgpa: null, status: 'Upcoming' },
    ]
  },
  {
    id: 'std_4',
    name: 'V. Raghava Chowdary',
    registerNumber: '22H71A6158',
    profilePhoto: null,
    email: 'raghava.22aiml@mictech.ac.in',
    phone: '+91 99887 76655',
    location: 'Nandigama',
    year: '3rd Year',
    term: '3-1',
    sscPercentage: 84.5,
    interType: 'Diploma',
    interPercentage: 86.2,
    semesterRecords: [
      { term: '1-1', semNumber: 1, cgpa: 7.70, status: 'Updated' },
      { term: '1-2', semNumber: 2, cgpa: 7.80, status: 'Updated' },
      { term: '2-1', semNumber: 3, cgpa: 7.80, status: 'Updated' },
      { term: '2-2', semNumber: 4, cgpa: 7.81, status: 'Updated' },
      { term: '3-1', semNumber: 5, cgpa: null, status: 'Ongoing' },
      { term: '3-2', semNumber: 6, cgpa: null, status: 'Upcoming' },
      { term: '4-1', semNumber: 7, cgpa: null, status: 'Upcoming' },
      { term: '4-2', semNumber: 8, cgpa: null, status: 'Upcoming' },
    ]
  },
  {
    id: 'std_5',
    name: 'T. Bhavya Sree',
    registerNumber: '22H71A6162',
    profilePhoto: null,
    email: 'bhavya.22aiml@mictech.ac.in',
    phone: '+91 94401 22334',
    location: 'Vijayawada',
    year: '3rd Year',
    term: '3-1',
    sscPercentage: 91.2,
    interType: 'Intermediate',
    interPercentage: 93.0,
    semesterRecords: [
      { term: '1-1', semNumber: 1, cgpa: 8.50, status: 'Updated' },
      { term: '1-2', semNumber: 2, cgpa: 8.60, status: 'Updated' },
      { term: '2-1', semNumber: 3, cgpa: 8.60, status: 'Updated' },
      { term: '2-2', semNumber: 4, cgpa: 8.61, status: 'Updated' },
      { term: '3-1', semNumber: 5, cgpa: null, status: 'Ongoing' },
      { term: '3-2', semNumber: 6, cgpa: null, status: 'Upcoming' },
      { term: '4-1', semNumber: 7, cgpa: null, status: 'Upcoming' },
      { term: '4-2', semNumber: 8, cgpa: null, status: 'Upcoming' },
    ]
  },

  // 4th Year (4-1) Students
  {
    id: 'std_6',
    name: 'B. Jagadeesh Kumar',
    registerNumber: '21H71A6104',
    profilePhoto: null,
    email: 'jagadeesh.21aiml@mictech.ac.in',
    phone: '+91 98480 11223',
    location: 'Vijayawada',
    year: '4th Year',
    term: '4-1',
    sscPercentage: 88.0,
    interType: 'Intermediate',
    interPercentage: 89.5,
    semesterRecords: [
      { term: '1-1', semNumber: 1, cgpa: 8.20, status: 'Updated' },
      { term: '1-2', semNumber: 2, cgpa: 8.30, status: 'Updated' },
      { term: '2-1', semNumber: 3, cgpa: 8.37, status: 'Updated' },
      { term: '2-2', semNumber: 4, cgpa: 8.36, status: 'Updated' },
      { term: '3-1', semNumber: 5, cgpa: 8.44, status: 'Updated' },
      { term: '3-2', semNumber: 6, cgpa: 8.45, status: 'Updated' },
      { term: '4-1', semNumber: 7, cgpa: null, status: 'Ongoing' },
      { term: '4-2', semNumber: 8, cgpa: null, status: 'Upcoming' },
    ]
  },
  {
    id: 'std_7',
    name: 'G. Tejaswi',
    registerNumber: '21H71A6118',
    profilePhoto: null,
    email: 'tejaswi.21aiml@mictech.ac.in',
    phone: '+91 99490 33445',
    location: 'Guntur',
    year: '4th Year',
    term: '4-1',
    sscPercentage: 94.0,
    interType: 'Intermediate',
    interPercentage: 95.0,
    semesterRecords: [
      { term: '1-1', semNumber: 1, cgpa: 8.90, status: 'Updated' },
      { term: '1-2', semNumber: 2, cgpa: 9.00, status: 'Updated' },
      { term: '2-1', semNumber: 3, cgpa: 9.03, status: 'Updated' },
      { term: '2-2', semNumber: 4, cgpa: 9.06, status: 'Updated' },
      { term: '3-1', semNumber: 5, cgpa: 9.11, status: 'Updated' },
      { term: '3-2', semNumber: 6, cgpa: 9.15, status: 'Updated' },
      { term: '4-1', semNumber: 7, cgpa: null, status: 'Ongoing' },
      { term: '4-2', semNumber: 8, cgpa: null, status: 'Upcoming' },
    ]
  },
  {
    id: 'std_8',
    name: 'Ch. Venkat Raman',
    registerNumber: '21H71A6129',
    profilePhoto: null,
    email: 'venkat.21aiml@mictech.ac.in',
    phone: '+91 97012 88990',
    location: 'Jaggaiahpet',
    year: '4th Year',
    term: '4-1',
    sscPercentage: 81.5,
    interType: 'Diploma',
    interPercentage: 84.0,
    semesterRecords: [
      { term: '1-1', semNumber: 1, cgpa: 7.30, status: 'Updated' },
      { term: '1-2', semNumber: 2, cgpa: 7.40, status: 'Updated' },
      { term: '2-1', semNumber: 3, cgpa: 7.33, status: 'Updated' },
      { term: '2-2', semNumber: 4, cgpa: 7.35, status: 'Updated' },
      { term: '3-1', semNumber: 5, cgpa: 7.37, status: 'Updated' },
      { term: '3-2', semNumber: 6, cgpa: 7.38, status: 'Updated' },
      { term: '4-1', semNumber: 7, cgpa: null, status: 'Ongoing' },
      { term: '4-2', semNumber: 8, cgpa: null, status: 'Upcoming' },
    ]
  },

  // 2nd Year (2-1) Students
  {
    id: 'std_9',
    name: 'D. Rohith Varma',
    registerNumber: '23H71A6112',
    profilePhoto: null,
    email: 'rohith.23aiml@mictech.ac.in',
    phone: '+91 96180 55667',
    location: 'Ibrahimpatnam',
    year: '2nd Year',
    term: '2-1',
    sscPercentage: 87.2,
    interType: 'Intermediate',
    interPercentage: 88.0,
    semesterRecords: [
      { term: '1-1', semNumber: 1, cgpa: 8.50, status: 'Updated' },
      { term: '1-2', semNumber: 2, cgpa: 8.55, status: 'Updated' },
      { term: '2-1', semNumber: 3, cgpa: null, status: 'Ongoing' },
      { term: '2-2', semNumber: 4, cgpa: null, status: 'Upcoming' },
      { term: '3-1', semNumber: 5, cgpa: null, status: 'Upcoming' },
      { term: '3-2', semNumber: 6, cgpa: null, status: 'Upcoming' },
      { term: '4-1', semNumber: 7, cgpa: null, status: 'Upcoming' },
      { term: '4-2', semNumber: 8, cgpa: null, status: 'Upcoming' },
    ]
  },
  {
    id: 'std_10',
    name: 'N. Pooja Sri',
    registerNumber: '23H71A6138',
    profilePhoto: null,
    email: 'pooja.23aiml@mictech.ac.in',
    phone: '+91 98492 44556',
    location: 'Vijayawada',
    year: '2nd Year',
    term: '2-1',
    sscPercentage: 93.5,
    interType: 'Intermediate',
    interPercentage: 94.0,
    semesterRecords: [
      { term: '1-1', semNumber: 1, cgpa: 9.00, status: 'Updated' },
      { term: '1-2', semNumber: 2, cgpa: 9.02, status: 'Updated' },
      { term: '2-1', semNumber: 3, cgpa: null, status: 'Ongoing' },
      { term: '2-2', semNumber: 4, cgpa: null, status: 'Upcoming' },
      { term: '3-1', semNumber: 5, cgpa: null, status: 'Upcoming' },
      { term: '3-2', semNumber: 6, cgpa: null, status: 'Upcoming' },
      { term: '4-1', semNumber: 7, cgpa: null, status: 'Upcoming' },
      { term: '4-2', semNumber: 8, cgpa: null, status: 'Upcoming' },
    ]
  },
  {
    id: 'std_11',
    name: 'S. Charan Teja',
    registerNumber: '23H71A6150',
    profilePhoto: null,
    email: 'charan.23aiml@mictech.ac.in',
    phone: '+91 91234 56789',
    location: 'Tiruvuru',
    year: '2nd Year',
    term: '2-1',
    sscPercentage: 80.2,
    interType: 'Diploma',
    interPercentage: 82.5,
    semesterRecords: [
      { term: '1-1', semNumber: 1, cgpa: 7.80, status: 'Updated' },
      { term: '1-2', semNumber: 2, cgpa: 7.86, status: 'Updated' },
      { term: '2-1', semNumber: 3, cgpa: null, status: 'Ongoing' },
      { term: '2-2', semNumber: 4, cgpa: null, status: 'Upcoming' },
      { term: '3-1', semNumber: 5, cgpa: null, status: 'Upcoming' },
      { term: '3-2', semNumber: 6, cgpa: null, status: 'Upcoming' },
      { term: '4-1', semNumber: 7, cgpa: null, status: 'Upcoming' },
      { term: '4-2', semNumber: 8, cgpa: null, status: 'Upcoming' },
    ]
  },
  {
    id: 'std_12',
    name: 'Y. Manasa',
    registerNumber: '23H71A6165',
    profilePhoto: null,
    email: 'manasa.23aiml@mictech.ac.in',
    phone: '+91 95022 77889',
    location: 'Mangalagiri',
    year: '2nd Year',
    term: '2-2',
    sscPercentage: 90.0,
    interType: 'Intermediate',
    interPercentage: 91.5,
    semesterRecords: [
      { term: '1-1', semNumber: 1, cgpa: 8.60, status: 'Updated' },
      { term: '1-2', semNumber: 2, cgpa: 8.70, status: 'Updated' },
      { term: '2-1', semNumber: 3, cgpa: 8.72, status: 'Updated' },
      { term: '2-2', semNumber: 4, cgpa: null, status: 'Ongoing' },
      { term: '3-1', semNumber: 5, cgpa: null, status: 'Upcoming' },
      { term: '3-2', semNumber: 6, cgpa: null, status: 'Upcoming' },
      { term: '4-1', semNumber: 7, cgpa: null, status: 'Upcoming' },
      { term: '4-2', semNumber: 8, cgpa: null, status: 'Upcoming' },
    ]
  }
];

export const INITIAL_UPDATE_REQUESTS = [
  {
    id: 'req_1',
    title: '5th Semester CGPA Update',
    targetYear: '3rd Year',
    targetSemester: '3-1',
    instructions: 'All 3rd Year (3-1) students are requested to enter and confirm their verified 3-1 semester CGPA.',
    createdAt: '2026-11-10',
    deadline: '2026-12-05',
    status: 'Active'
  },
  {
    id: 'req_2',
    title: '7th Semester CGPA Update',
    targetYear: '4th Year',
    targetSemester: '4-1',
    instructions: 'All 4th Year (4-1) students must verify their 4-1 semester marks statement and update official grades.',
    createdAt: '2026-11-14',
    deadline: '2026-12-10',
    status: 'Active'
  },
  {
    id: 'req_3',
    title: '3rd Semester CGPA Update',
    targetYear: '2nd Year',
    targetSemester: '2-1',
    instructions: 'All 2nd Year (2-1) students must ensure their 2-1 semester CGPA records are confirmed.',
    createdAt: '2026-11-18',
    deadline: '2026-12-15',
    status: 'Active'
  },
  {
    id: 'req_4',
    title: '4th Semester CGPA Update',
    targetYear: '2nd Year',
    targetSemester: '2-2',
    instructions: 'All 2nd Year (2-2) students are requested to enter and confirm their verified 2-2 semester CGPA.',
    createdAt: '2026-11-20',
    deadline: '2026-12-20',
    status: 'Active'
  }
];

// Helper to compute latest completed semester and latest CGPA for a student
export const getStudentLatestAcademics = (student) => {
  if (!student) {
    return {
      latestSemester: 'None',
      latestCgpa: null,
    };
  }
  const records = student.semesterRecords || student.aiml_semester_records || [];
  const sorted = [...records].sort((a, b) => {
    const semA = a.semesterNumber ?? a.semNumber ?? a.semester_number ?? 0;
    const semB = b.semesterNumber ?? b.semNumber ?? b.semester_number ?? 0;
    return semA - semB;
  });
  const completed = sorted.filter(r => {
    const val = r?.cgpa ?? r?.cumulative_cgpa;
    return val !== null && val !== undefined && val !== '' && !isNaN(Number(val));
  });
  if (completed.length === 0) {
    return {
      latestSemester: 'None',
      latestCgpa: null,
    };
  }
  const latest = completed[completed.length - 1];
  const semNum = latest.semesterNumber ?? latest.semNumber ?? latest.semester_number;
  return {
    latestSemester: semNum ? `Semester ${semNum}` : (latest.term || 'None'),
    latestCgpa: latest.cgpa ?? latest.cumulative_cgpa ?? null,
  };
};

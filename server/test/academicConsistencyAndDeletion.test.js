import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  getStudentMaxCompletedSem,
  getSemesterCgpaDisplay,
  getSemesterUpdateStatus,
  getStudentLatestAcademics,
  isStudentSubmittedForCampaign
} from '../../client/src/utils/academicStatusUtils.js';

describe('Academic Status & CGPA Consistency Suite', () => {
  const studentWithRecords = {
    id: 'std-1',
    registerNumber: '22H71A6125',
    currentYear: 3,
    currentTerm: 1, // Max completed: ((3-1)*2) + 1 - 1 = 4
    semesterRecords: [
      { semesterNumber: 1, cumulative_cgpa: 8.10, status: 'Updated' },
      { semesterNumber: 2, cumulative_cgpa: 8.42, status: 'Updated' },
      { semesterNumber: 3, cumulative_cgpa: 7.85, status: 'Updated' }
      // Semester 4 is eligible, but not yet provided
    ]
  };

  const studentWithNoRecords = {
    id: 'std-2',
    registerNumber: '23H71A6101',
    currentYear: 2,
    currentTerm: 1, // Max completed: ((2-1)*2) + 1 - 1 = 2
    semesterRecords: []
  };

  test('1. Eligibility formula: maxCompletedSem = ((year - 1) * 2) + term - 1', () => {
    assert.equal(getStudentMaxCompletedSem({ currentYear: 2, currentTerm: 1 }), 2);
    assert.equal(getStudentMaxCompletedSem({ currentYear: 2, currentTerm: 2 }), 3);
    assert.equal(getStudentMaxCompletedSem({ currentYear: 3, currentTerm: 1 }), 4);
    assert.equal(getStudentMaxCompletedSem({ currentYear: 3, currentTerm: 2 }), 5);
    assert.equal(getStudentMaxCompletedSem({ currentYear: 4, currentTerm: 1 }), 6);
    assert.equal(getStudentMaxCompletedSem({ currentYear: 4, currentTerm: 2 }), 7);
  });

  test('2. CGPA Display: Never returns "Pending" and never uses success badge for missing data', () => {
    // Semester 1 has saved CGPA
    const sem1 = getSemesterCgpaDisplay(studentWithRecords, 1);
    assert.equal(sem1.display, '8.10');
    assert.equal(sem1.numericCgpa, 8.10);
    assert.ok(sem1.badgeClass.includes('bg-emerald-100'));

    // Semester 4 is eligible, but has no record in database -> "Not Provided"
    const sem4 = getSemesterCgpaDisplay(studentWithRecords, 4);
    assert.equal(sem4.display, 'Not Provided');
    assert.equal(sem4.numericCgpa, null);
    assert.notEqual(sem4.display, 'Pending');
    assert.ok(!sem4.badgeClass.includes('bg-emerald-100')); // MUST NOT BE GREEN

    // Semester 5 is ongoing (ineligible) -> "—"
    const sem5 = getSemesterCgpaDisplay(studentWithRecords, 5);
    assert.equal(sem5.display, '—');
    assert.equal(sem5.isEligible, false);
  });

  test('3. Update Status: Uses Submitted, Pending Submission, No Active Request, Not Eligible', () => {
    const campaigns = [
      {
        id: 'camp-sem-4',
        target_year: 3,
        target_semester: 4,
        is_active: true
      }
    ];

    // Sem 3: Has CGPA -> Submitted
    const statusSem3 = getSemesterUpdateStatus(studentWithRecords, 3, campaigns);
    assert.equal(statusSem3.status, 'Submitted');
    assert.ok(statusSem3.badgeClass.includes('bg-emerald-50'));

    // Sem 4: Eligible, active campaign exists, no CGPA -> Pending Submission
    const statusSem4 = getSemesterUpdateStatus(studentWithRecords, 4, campaigns);
    assert.equal(statusSem4.status, 'Pending Submission');
    assert.ok(statusSem4.badgeClass.includes('bg-amber-50'));

    // Sem 2 for student with no records and no campaigns -> No Active Request
    const statusSem2NoCamp = getSemesterUpdateStatus(studentWithNoRecords, 2, []);
    assert.equal(statusSem2NoCamp.status, 'No Active Request');
    assert.ok(statusSem2NoCamp.badgeClass.includes('bg-slate-100'));

    // Sem 5: Ineligible -> Not Eligible
    const statusSem5 = getSemesterUpdateStatus(studentWithRecords, 5, campaigns);
    assert.equal(statusSem5.status, 'Not Eligible');
  });

  test('4. Latest CGPA: Returns actual most recently saved eligible CGPA, never "Sem None"', () => {
    const latest1 = getStudentLatestAcademics(studentWithRecords);
    assert.equal(latest1.latestSemester, 3);
    assert.equal(latest1.latestCgpa, 7.85);
    assert.equal(latest1.displaySemester, 'Sem 3');
    assert.equal(latest1.displayCgpa, '7.85');

    const latestNone = getStudentLatestAcademics(studentWithNoRecords);
    assert.equal(latestNone.latestSemester, null);
    assert.equal(latestNone.latestCgpa, null);
    assert.equal(latestNone.displaySemester, 'Not Provided');
    assert.equal(latestNone.displayCgpa, 'Not Provided');
    assert.notEqual(latestNone.displaySemester, 'Sem None');
  });

  test('5. Campaign submission matching correctly detects student CGPA entry', () => {
    const campSem3 = { target_year: 3, target_semester: 3 };
    const campSem4 = { target_year: 3, target_semester: 4 };

    assert.equal(isStudentSubmittedForCampaign(studentWithRecords, campSem3), true);
    assert.equal(isStudentSubmittedForCampaign(studentWithRecords, campSem4), false);
  });
});

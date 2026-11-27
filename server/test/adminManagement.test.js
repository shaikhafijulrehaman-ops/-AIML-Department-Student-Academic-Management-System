import { test, describe, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import app from '../src/app.js';
import { setSupabaseAdminMock, resetSupabaseAdminMock } from '../src/config/supabaseAdmin.js';

let server;
let baseUrl;

const HOD_USER_ID = '99999999-9999-4999-a999-999999999999';
const STUDENT_1_ID = '11111111-1111-4111-a111-111111111111';
const STUDENT_1_USER_ID = 'aaaa1111-1111-4111-a111-111111111111';
const STUDENT_2_ID = '22222222-2222-4222-a222-222222222222';
const STUDENT_2_USER_ID = 'bbbb2222-2222-4222-a222-222222222222';

let mockProfiles = {};
let mockSemesterRecords = [];
let mockAuditLogs = [];
let mockAuthUsers = {};
let authAdminUpdatePasswordCalled = false;
let authAdminDeleteUserCalled = false;

function resetMockState() {
  authAdminUpdatePasswordCalled = false;
  authAdminDeleteUserCalled = false;
  mockAuditLogs = [];
  mockAuthUsers = {
    [STUDENT_1_USER_ID]: { id: STUDENT_1_USER_ID, email: '21b91a5401@aiml.mic.edu.in' },
    [STUDENT_2_USER_ID]: { id: STUDENT_2_USER_ID, email: '21b91a5402@aiml.mic.edu.in' }
  };

  mockProfiles = {
    [STUDENT_1_ID]: {
      id: STUDENT_1_ID,
      user_id: STUDENT_1_USER_ID,
      register_number: '21B91A5401',
      full_name: 'Shaik Student One',
      email: 'student1@gmail.com',
      phone_number: '9959593027',
      location: 'Vijayawada',
      current_year: 2,
      current_term: 1,
      qualification_type: 'intermediate',
      ssc_percentage: 85.5,
      intermediate_percentage: 88.0,
      has_backlogs: false,
      backlog_count: 0,
      profile_photo_path: null,
      is_active: true,
      must_change_password: false,
      is_profile_completed: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    [STUDENT_2_ID]: {
      id: STUDENT_2_ID,
      user_id: STUDENT_2_USER_ID,
      register_number: '21B91A5402',
      full_name: 'Student Two With Records',
      email: 'student2@gmail.com',
      phone_number: '9959593028',
      location: 'Guntur',
      current_year: 3,
      current_term: 1,
      qualification_type: 'diploma',
      ssc_percentage: 90.0,
      intermediate_percentage: 92.0,
      has_backlogs: true,
      backlog_count: 2,
      profile_photo_path: null,
      is_active: true,
      must_change_password: false,
      is_profile_completed: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  };

  // Student 2 has semester records; Student 1 has none
  mockSemesterRecords = [
    {
      id: 'rec-1',
      student_profile_id: STUDENT_2_ID,
      semester_number: 1,
      cumulative_cgpa: 8.5
    }
  ];

  setSupabaseAdminMock({
    auth: {
      getUser: async (token) => {
        if (token === 'valid-hod-token') {
          return { data: { user: { id: HOD_USER_ID, email: 'hod@mic.edu.in' } }, error: null };
        }
        if (token === 'student-1-token') {
          return { data: { user: { id: STUDENT_1_USER_ID, email: '21b91a5401@aiml.mic.edu.in' } }, error: null };
        }
        return { data: { user: null }, error: { message: 'Invalid token' } };
      },
      admin: {
        updateUserById: async (userId, attrs) => {
          authAdminUpdatePasswordCalled = true;
          return { data: { user: { id: userId, ...attrs } }, error: null };
        },
        deleteUser: async (userId) => {
          authAdminDeleteUserCalled = true;
          delete mockAuthUsers[userId];
          return { data: { user: null }, error: null };
        }
      }
    },
    from: (table) => {
      let filters = {};
      let updatePayload = null;

      const builder = {
        select: (cols) => builder,
        order: (col, opts) => builder,
        eq: (col, val) => {
          filters[col] = val;
          return builder;
        },
        update: (payload) => {
          updatePayload = payload;
          return builder;
        },
        delete: () => builder,
        insert: async (row) => {
          mockAuditLogs.push(row);
          return { data: row, error: null };
        },
        single: async () => {
          if (table === 'aiml_user_roles') {
            if (filters.user_id === HOD_USER_ID && filters.role === 'hod' && filters.is_active === true) {
              return { data: { id: 'role-1', user_id: HOD_USER_ID, role: 'hod', is_active: true }, error: null };
            }
            return { data: null, error: { message: 'Role not found' } };
          }

          if (table === 'aiml_student_profiles') {
            let profile = null;
            if (filters.id) {
              profile = mockProfiles[filters.id];
            } else if (filters.user_id) {
              profile = Object.values(mockProfiles).find((p) => p.user_id === filters.user_id);
            }

            if (!profile) {
              return { data: null, error: { message: 'Student profile not found' } };
            }

            if (updatePayload) {
              Object.assign(profile, updatePayload);
              return { data: { ...profile }, error: null };
            }

            const attachedSem = mockSemesterRecords.filter((r) => r.student_profile_id === profile.id);
            return {
              data: {
                ...profile,
                aiml_semester_records: attachedSem,
                aiml_campaign_students: []
              },
              error: null
            };
          }

          return { data: null, error: { message: 'Not found' } };
        },
        then: (resolve) => {
          if (table === 'aiml_student_profiles' && updatePayload && filters.id) {
            const profile = mockProfiles[filters.id];
            if (profile) Object.assign(profile, updatePayload);
            resolve({ error: null });
            return;
          }
          if (table === 'aiml_student_profiles' && filters.id) {
            delete mockProfiles[filters.id];
            resolve({ error: null });
            return;
          }
          if (table === 'aiml_user_roles') {
            resolve({ error: null });
            return;
          }
          if (table === 'aiml_audit_logs') {
            resolve({ error: null });
            return;
          }
          resolve({ data: [], error: null });
        }
      };

      return builder;
    },
    storage: {
      from: () => ({
        remove: async () => ({ error: null }),
        createSignedUrl: async () => ({ data: { signedUrl: 'https://example.com/photo.jpg' }, error: null })
      })
    }
  });
}

describe('HOD Account Management and Backlog Features', () => {
  before(async () => {
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}`;
  });

  after(async () => {
    resetSupabaseAdminMock();
    await new Promise((resolve) => server.close(resolve));
  });

  beforeEach(() => {
    resetMockState();
  });

  test('Backlog validation on profile update: No backlogs sets count to 0', async () => {
    const res = await fetch(`${baseUrl}/api/student/profile`, {
      method: 'PUT',
      headers: {
        'Authorization': 'Bearer student-1-token',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        hasBacklogs: false,
        backlogCount: 5 // Should be normalized to 0
      })
    });

    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.equal(json.data.has_backlogs, false);
    assert.equal(json.data.backlog_count, 0);
  });

  test('Backlog validation on profile update: Yes requires positive integer >= 1', async () => {
    // 1. Rejects 0 when hasBacklogs is true
    const resZero = await fetch(`${baseUrl}/api/student/profile`, {
      method: 'PUT',
      headers: {
        'Authorization': 'Bearer student-1-token',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        hasBacklogs: true,
        backlogCount: 0
      })
    });
    assert.equal(resZero.status, 400);

    // 2. Rejects negative values
    const resNeg = await fetch(`${baseUrl}/api/student/profile`, {
      method: 'PUT',
      headers: {
        'Authorization': 'Bearer student-1-token',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        hasBacklogs: true,
        backlogCount: -2
      })
    });
    assert.equal(resNeg.status, 400);

    // 3. Accepts positive integer >= 1
    const resValid = await fetch(`${baseUrl}/api/student/profile`, {
      method: 'PUT',
      headers: {
        'Authorization': 'Bearer student-1-token',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        hasBacklogs: true,
        backlogCount: 3
      })
    });
    assert.equal(resValid.status, 200);
    const json = await resValid.json();
    assert.equal(json.data.has_backlogs, true);
    assert.equal(json.data.backlog_count, 3);
  });

  test('Custom Location: Saves custom string and rejects literal Other', async () => {
    // 1. Rejects literal "Other"
    const resOther = await fetch(`${baseUrl}/api/student/profile`, {
      method: 'PUT',
      headers: {
        'Authorization': 'Bearer student-1-token',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        location: 'Other'
      })
    });
    assert.equal(resOther.status, 400);

    // 2. Accepts custom village / town name
    const resValidLoc = await fetch(`${baseUrl}/api/student/profile`, {
      method: 'PUT',
      headers: {
        'Authorization': 'Bearer student-1-token',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        location: 'Kankipadu Village'
      })
    });
    assert.equal(resValidLoc.status, 200);
    const json = await resValidLoc.json();
    assert.equal(json.data.location, 'Kankipadu Village');
  });

  test('HOD Student Password Reset: Generates temporary password, sets flag, updates auth', async () => {
    const res = await fetch(`${baseUrl}/api/hod/students/${STUDENT_1_ID}/reset-password`, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer valid-hod-token',
        'Content-Type': 'application/json'
      }
    });

    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.ok(json.temporaryPassword);
    assert.ok(json.temporaryPassword.length >= 10);
    assert.equal(authAdminUpdatePasswordCalled, true);
    assert.equal(mockProfiles[STUDENT_1_ID].must_change_password, true);
  });

  test('HOD Student Deactivation & Reactivation: Toggles is_active successfully', async () => {
    // 1. Deactivate Student 1
    const resDeactivate = await fetch(`${baseUrl}/api/hod/students/${STUDENT_1_ID}/status`, {
      method: 'PATCH',
      headers: {
        'Authorization': 'Bearer valid-hod-token',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ isActive: false })
    });
    assert.equal(resDeactivate.status, 200);
    const jsonDeact = await resDeactivate.json();
    assert.equal(jsonDeact.data.is_active, false);
    assert.equal(mockProfiles[STUDENT_1_ID].is_active, false);

    // 2. Reactivate Student 1
    const resReactivate = await fetch(`${baseUrl}/api/hod/students/${STUDENT_1_ID}/status`, {
      method: 'PATCH',
      headers: {
        'Authorization': 'Bearer valid-hod-token',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ isActive: true })
    });
    assert.equal(resReactivate.status, 200);
    const jsonReact = await resReactivate.json();
    assert.equal(jsonReact.data.is_active, true);
    assert.equal(mockProfiles[STUDENT_1_ID].is_active, true);
  });

  test('Permanent Deletion Safeguard: Blocked when student has semester records', async () => {
    const res = await fetch(`${baseUrl}/api/hod/students/${STUDENT_2_ID}`, {
      method: 'DELETE',
      headers: {
        'Authorization': 'Bearer valid-hod-token',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        confirmationRegisterNumber: '21B91A5402'
      })
    });

    assert.equal(res.status, 400);
    const json = await res.json();
    assert.equal(json.success, false);
    assert.ok(json.error.includes('academic semester record'));
    assert.ok(mockProfiles[STUDENT_2_ID]);
    assert.equal(authAdminDeleteUserCalled, false);
  });

  test('Permanent Deletion: Allowed when 0 records exist and register number matches', async () => {
    // 1. Rejects if register number mismatch
    const resMismatch = await fetch(`${baseUrl}/api/hod/students/${STUDENT_1_ID}`, {
      method: 'DELETE',
      headers: {
        'Authorization': 'Bearer valid-hod-token',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        confirmationRegisterNumber: 'WRONGREGNO'
      })
    });
    assert.equal(resMismatch.status, 400);
    assert.ok(mockProfiles[STUDENT_1_ID]);

    // 2. Deletes when register number matches exactly
    const resSuccess = await fetch(`${baseUrl}/api/hod/students/${STUDENT_1_ID}`, {
      method: 'DELETE',
      headers: {
        'Authorization': 'Bearer valid-hod-token',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        confirmationRegisterNumber: '21B91A5401'
      })
    });
    assert.equal(resSuccess.status, 200);
    const json = await resSuccess.json();
    assert.equal(json.success, true);
    assert.equal(mockProfiles[STUDENT_1_ID], undefined);
    assert.equal(authAdminDeleteUserCalled, true);
  });
});

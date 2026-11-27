import { test, describe, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import app from '../src/app.js';
import { setSupabaseAdminMock, resetSupabaseAdminMock } from '../src/config/supabaseAdmin.js';

let server;
let baseUrl;

// Sample Valid UUIDs
const PROFILE_ID_A = '11111111-1111-4111-a111-111111111111';
const PROFILE_ID_B = '22222222-2222-4222-a222-222222222222';
const PROFILE_ID_INACTIVE = '33333333-3333-4333-a333-333333333333';
const PROFILE_ID_COMPLETED = '44444444-4444-4444-a444-444444444444';
const PROFILE_ID_READY = '55555555-5555-4555-a555-555555555555';

const USER_ID_A = 'aaaa1111-1111-4111-a111-111111111111';
const USER_ID_B = 'bbbb2222-2222-4222-a222-222222222222';
const USER_ID_INACTIVE = 'cccc3333-3333-4333-a333-333333333333';
const USER_ID_COMPLETED = 'dddd4444-4444-4444-a444-444444444444';
const USER_ID_READY = 'eeee5555-5555-4555-a555-555555555555';

// Mock DB State
let mockProfiles = {};
let mockSemesterRecords = {};
let dbUpdateShouldFail = false;
let authUpdateShouldFail = false;
let authUpdateErrorMessage = 'Password too weak';
let lastAdminUpdateCall = null;

function initializeMockData() {
  dbUpdateShouldFail = false;
  authUpdateShouldFail = false;
  authUpdateErrorMessage = 'Password too weak';
  lastAdminUpdateCall = null;
  mockSemesterRecords = {};

  mockProfiles = {
    [PROFILE_ID_A]: {
      id: PROFILE_ID_A,
      user_id: USER_ID_A,
      register_number: '21B91A5401',
      full_name: null,
      email: null,
      phone_number: null,
      location: null,
      current_year: null,
      current_term: null,
      qualification_type: null,
      ssc_percentage: null,
      intermediate_percentage: null,
      profile_photo_path: null,
      is_active: true,
      must_change_password: true,
      is_profile_completed: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    [PROFILE_ID_B]: {
      id: PROFILE_ID_B,
      user_id: USER_ID_B,
      register_number: '21B91A5402',
      full_name: 'Student B',
      email: 'student.b@mictech.ac.in',
      phone_number: '9876543211',
      location: 'Guntur',
      current_year: 2,
      current_term: 2,
      qualification_type: 'intermediate',
      ssc_percentage: 82.0,
      intermediate_percentage: 80.0,
      profile_photo_path: null,
      is_active: true,
      must_change_password: false,
      is_profile_completed: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    [PROFILE_ID_INACTIVE]: {
      id: PROFILE_ID_INACTIVE,
      user_id: USER_ID_INACTIVE,
      register_number: '21B91A5403',
      full_name: 'Inactive Student',
      email: 'inactive@mictech.ac.in',
      is_active: false,
      must_change_password: true,
      is_profile_completed: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    [PROFILE_ID_COMPLETED]: {
      id: PROFILE_ID_COMPLETED,
      user_id: USER_ID_COMPLETED,
      register_number: '21B91A5404',
      full_name: 'Completed Student',
      email: 'completed@mictech.ac.in',
      phone_number: '9876543210',
      location: 'Vijayawada',
      current_year: 3,
      current_term: 1, // Max completed semester = ((3-1)*2) + 1 - 1 = 4
      qualification_type: 'intermediate',
      ssc_percentage: 88.5,
      intermediate_percentage: 85.0,
      profile_photo_path: `${USER_ID_COMPLETED}/avatar.png`,
      is_active: true,
      must_change_password: false,
      is_profile_completed: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    [PROFILE_ID_READY]: {
      id: PROFILE_ID_READY,
      user_id: USER_ID_READY,
      register_number: '21B91A5405',
      full_name: 'Ready Student',
      email: 'ready@mictech.ac.in',
      phone_number: '9988776655',
      location: 'Vijayawada',
      current_year: 3,
      current_term: 1,
      qualification_type: 'intermediate',
      ssc_percentage: 90.0,
      intermediate_percentage: 89.0,
      profile_photo_path: null,
      is_active: true,
      must_change_password: false, // Initial password changed
      is_profile_completed: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  };
}

// Build mock Supabase Admin
function createMockSupabaseAdmin() {
  return {
    auth: {
      getUser: async (token) => {
        if (!token || token === 'expired-token' || token === 'invalid-token') {
          return { data: { user: null }, error: { message: 'Invalid or expired token.' } };
        }
        if (token === 'token-student-a') {
          return { data: { user: { id: USER_ID_A, email: 'student.a@mictech.ac.in' } }, error: null };
        }
        if (token === 'token-student-b') {
          return { data: { user: { id: USER_ID_B, email: 'student.b@mictech.ac.in' } }, error: null };
        }
        if (token === 'token-inactive') {
          return { data: { user: { id: USER_ID_INACTIVE, email: 'inactive@mictech.ac.in' } }, error: null };
        }
        if (token === 'token-completed') {
          return { data: { user: { id: USER_ID_COMPLETED, email: 'completed@mictech.ac.in' } }, error: null };
        }
        if (token === 'token-ready') {
          return { data: { user: { id: USER_ID_READY, email: 'ready@mictech.ac.in' } }, error: null };
        }
        if (token.startsWith('fresh-token') || token === 'refreshed-access-token') {
          return { data: { user: { id: USER_ID_A, email: 'student.a@mictech.ac.in' } }, error: null };
        }
        return { data: { user: null }, error: { message: 'Unknown token.' } };
      },
      signInWithPassword: async ({ email, password }) => {
        if (!email || !password || password === 'invalid-password') {
          return { data: { user: null, session: null }, error: { message: 'Invalid login credentials' } };
        }
        return {
          data: {
            user: { id: USER_ID_A, email },
            session: {
              access_token: 'fresh-token-' + Date.now(),
              refresh_token: 'fresh-refresh-' + Date.now(),
              expires_at: Math.floor(Date.now() / 1000) + 3600,
              expires_in: 3600
            }
          },
          error: null
        };
      },
      refreshSession: async ({ refresh_token }) => {
        if (!refresh_token || refresh_token === 'invalid-refresh') {
          return { data: { session: null }, error: { message: 'Invalid refresh token' } };
        }
        return {
          data: {
            session: {
              access_token: 'refreshed-access-token',
              refresh_token: 'refreshed-refresh-token',
              expires_at: Math.floor(Date.now() / 1000) + 3600,
              expires_in: 3600
            }
          },
          error: null
        };
      },
      admin: {
        updateUserById: async (userId, attributes) => {
          lastAdminUpdateCall = { userId, attributes };
          if (authUpdateShouldFail) {
            return { data: { user: null }, error: { message: authUpdateErrorMessage } };
          }
          return { data: { user: { id: userId, ...attributes } }, error: null };
        }
      }
    },
    from: (table) => {
      let filter = {};
      let updates = null;
      let isUpsert = false;
      let upsertPayload = null;

      const builder = {
        select: (fields) => builder,
        order: (col, opts) => builder,
        eq: (col, val) => {
          filter[col] = val;
          return builder;
        },
        update: (data) => {
          updates = data;
          return builder;
        },
        upsert: (payload) => {
          isUpsert = true;
          upsertPayload = payload;
          return builder;
        },
        single: async () => {
          if (table === 'aiml_semester_records' && isUpsert) {
            if (dbUpdateShouldFail) {
              return { data: null, error: { message: 'Database write error' } };
            }
            const recId = 'rec-' + upsertPayload.student_profile_id + '-' + upsertPayload.semester_number;
            const saved = {
              id: recId,
              ...upsertPayload,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
            mockSemesterRecords[recId] = saved;
            return { data: saved, error: null };
          }

          if (table === 'aiml_student_profiles') {
            if (updates && dbUpdateShouldFail) {
              return { data: null, error: { message: 'Database connection timeout during update' } };
            }

            const rows = Object.values(mockProfiles).filter(p => {
              for (const [k, v] of Object.entries(filter)) {
                if (p[k] !== v) return false;
              }
              return true;
            });

            if (rows.length === 0) {
              return { data: null, error: { message: 'Profile record not found' } };
            }

            const target = rows[0];
            if (updates) {
              Object.assign(target, updates);
            }
            return { data: { ...target }, error: null };
          }

          return { data: null, error: { message: 'Unknown table' } };
        },
        then: (resolve) => {
          if (dbUpdateShouldFail) {
            return resolve({ data: null, error: { message: 'Database error' } });
          }
          if (table === 'aiml_semester_records') {
            const matched = Object.values(mockSemesterRecords).filter(r => {
              for (const [k, v] of Object.entries(filter)) {
                if (r[k] !== v) return false;
              }
              return true;
            });
            return resolve({ data: matched, error: null });
          }
          if (table === 'aiml_student_profiles') {
            const matched = Object.values(mockProfiles).filter(p => {
              for (const [k, v] of Object.entries(filter)) {
                if (p[k] !== v) return false;
              }
              return true;
            });
            if (updates) {
              matched.forEach(p => Object.assign(p, updates));
            }
            return resolve({ data: matched.map(m => ({ id: m.id })), error: null });
          }
          return resolve({ data: [], error: null });
        }
      };

      return builder;
    },
    rpc: async (fnName, params) => {
      if (fnName === 'aiml_complete_student_profile') {
        const profile = mockProfiles[params.p_student_id];
        if (!profile) {
          return { data: null, error: { message: `Student profile ${params.p_student_id} not found.` } };
        }
        if (profile.must_change_password) {
          return { data: null, error: { message: 'Please change your initial password before completing your student profile.' } };
        }
        profile.is_profile_completed = true;
        profile.updated_at = new Date().toISOString();
        return { data: { ...profile }, error: null };
      }
      return { data: null, error: { message: `Unknown RPC ${fnName}` } };
    }
  };
}

describe('Student Authentication & Profile Hardening Suite', () => {
  before(async () => {
    initializeMockData();
    setSupabaseAdminMock(createMockSupabaseAdmin());

    await new Promise((resolve) => {
      server = http.createServer(app);
      server.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  after(async () => {
    resetSupabaseAdminMock();
    await new Promise((resolve) => server.close(resolve));
  });

  beforeEach(() => {
    initializeMockData();
  });

  // --------------------------------------------------------------------------
  // 1. Password Update via Admin API with Verified req.user.id
  // --------------------------------------------------------------------------
  describe('1. Admin Password Update Security', () => {
    test('Password update uses verified req.user.id and ignores arbitrary user IDs in body', async () => {
      const res = await fetch(`${baseUrl}/api/student/change-initial-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer token-student-a'
        },
        body: JSON.stringify({
          userId: 'attacker-arbitrary-user-id',
          studentProfileId: PROFILE_ID_B,
          newPassword: 'ValidSecurePassword123'
        })
      });

      assert.equal(res.status, 200);
      assert.notEqual(lastAdminUpdateCall, null);
      // Strictly verified req.user.id used:
      assert.equal(lastAdminUpdateCall.userId, USER_ID_A);
      assert.notEqual(lastAdminUpdateCall.userId, 'attacker-arbitrary-user-id');
    });

    test('Password whitespace is preserved without trimming', async () => {
      const passwordWithSpaces = '  my secret pass 123  ';
      const res = await fetch(`${baseUrl}/api/student/change-initial-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer token-student-a'
        },
        body: JSON.stringify({
          newPassword: passwordWithSpaces
        })
      });

      assert.equal(res.status, 200);
      assert.equal(lastAdminUpdateCall.attributes.password, passwordWithSpaces);
    });

    test('Password update returns replacement token, refresh token, and session metadata', async () => {
      const res = await fetch(`${baseUrl}/api/student/change-initial-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer token-student-a'
        },
        body: JSON.stringify({
          newPassword: 'BrandNewSecurePassword123!'
        })
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.success, true);
      assert.ok(data.token, 'Should return replacement access token');
      assert.ok(data.refreshToken, 'Should return replacement refresh token');
      assert.equal(data.data.mustChangePassword, false);
    });

    test('Session refresh endpoint POST /api/auth/refresh returns new tokens for valid refresh token', async () => {
      const res = await fetch(`${baseUrl}/api/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          refreshToken: 'valid-test-refresh-token'
        })
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.success, true);
      assert.equal(data.token, 'refreshed-access-token');
      assert.equal(data.refreshToken, 'refreshed-refresh-token');
    });

    test('Session refresh endpoint POST /api/auth/refresh rejects missing or invalid refresh token with 400/401', async () => {
      const res1 = await fetch(`${baseUrl}/api/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });
      assert.equal(res1.status, 400);

      const res2 = await fetch(`${baseUrl}/api/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ refreshToken: 'invalid-refresh' })
      });
      assert.equal(res2.status, 401);
    });

    test('Whitespace-only or empty passwords are rejected with 400', async () => {
      const res = await fetch(`${baseUrl}/api/student/change-initial-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer token-student-a'
        },
        body: JSON.stringify({
          newPassword: '     '
        })
      });

      assert.equal(res.status, 400);
      const data = await res.json();
      assert.equal(data.success, false);
      assert.match(data.error, /New password is required/);
    });

    test('Auth failure leaves must_change_password unchanged', async () => {
      authUpdateShouldFail = true;
      authUpdateErrorMessage = 'Password breached in previous leaks';

      const res = await fetch(`${baseUrl}/api/student/change-initial-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer token-student-a'
        },
        body: JSON.stringify({
          newPassword: 'BreachedPassword123'
        })
      });

      assert.equal(res.status, 400);
      const data = await res.json();
      assert.equal(data.success, false);
      assert.match(data.error, /Password breached/);
      // Database flag remains true
      assert.equal(mockProfiles[PROFILE_ID_A].must_change_password, true);
    });

    test('Database flag update failure is recoverable with AUTH_UPDATED_FLAG_SYNC_FAILED', async () => {
      authUpdateShouldFail = false;
      dbUpdateShouldFail = true;

      const res = await fetch(`${baseUrl}/api/student/change-initial-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer token-student-a'
        },
        body: JSON.stringify({
          newPassword: 'RecoverablePassword123'
        })
      });

      assert.equal(res.status, 500);
      const data = await res.json();
      assert.equal(data.success, false);
      assert.equal(data.code, 'AUTH_UPDATED_FLAG_SYNC_FAILED');
    });
  });

  // --------------------------------------------------------------------------
  // 2. Profile Photo Ownership & Traversal Protection
  // --------------------------------------------------------------------------
  describe('2. Profile Photo Storage Ownership & Path Security', () => {
    test('Photo path belonging to another user is rejected with 403', async () => {
      const res = await fetch(`${baseUrl}/api/student/complete-profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer token-ready'
        },
        body: JSON.stringify({
          studentProfileId: PROFILE_ID_READY,
          fullName: 'Ananya Sharma',
          email: 'ananya.sharma@mictech.ac.in',
          phoneNumber: '9988776655',
          location: 'Vijayawada',
          currentYear: 3,
          currentTerm: 1,
          qualificationType: 'intermediate',
          sscPercentage: 92.0,
          intermediatePercentage: 90.0,
          profilePhotoPath: `${USER_ID_B}/other-photo.jpg` // Belongs to User B!
        })
      });

      assert.equal(res.status, 403);
      const data = await res.json();
      assert.equal(data.success, false);
      assert.match(data.error, /must reside directly inside your own user storage directory/);
    });

    test('Photo path with directory traversal is rejected with 403', async () => {
      const res = await fetch(`${baseUrl}/api/student/complete-profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer token-ready'
        },
        body: JSON.stringify({
          studentProfileId: PROFILE_ID_READY,
          fullName: 'Ananya Sharma',
          email: 'ananya.sharma@mictech.ac.in',
          phoneNumber: '9988776655',
          location: 'Vijayawada',
          currentYear: 3,
          currentTerm: 1,
          qualificationType: 'intermediate',
          sscPercentage: 92.0,
          intermediatePercentage: 90.0,
          profilePhotoPath: `${USER_ID_READY}/../../../etc/passwd`
        })
      });

      assert.equal(res.status, 403);
      const data = await res.json();
      assert.equal(data.success, false);
      assert.match(data.error, /path traversal/);
    });

    test('Valid owned photo path is accepted', async () => {
      const validPhoto = `${USER_ID_READY}/profile-photo.png`;
      const res = await fetch(`${baseUrl}/api/student/complete-profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer token-ready'
        },
        body: JSON.stringify({
          studentProfileId: PROFILE_ID_READY,
          fullName: 'Ananya Sharma',
          email: 'ananya.sharma@mictech.ac.in',
          phoneNumber: '9988776655',
          location: 'Vijayawada',
          currentYear: 3,
          currentTerm: 1,
          qualificationType: 'intermediate',
          sscPercentage: 92.0,
          intermediatePercentage: 90.0,
          hasBacklogs: false,
          backlogCount: 0,
          profilePhotoPath: validPhoto
        })
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.success, true);
      assert.equal(data.data.profilePhotoPath, validPhoto);
    });
  });

  // --------------------------------------------------------------------------
  // 3. Strengthened Profile Updates
  // --------------------------------------------------------------------------
  describe('3. Profile Update Preconditions', () => {
    test('Profile update requires ownership, active status, and incomplete state', async () => {
      // Completed student trying to run complete-profile again
      const res = await fetch(`${baseUrl}/api/student/complete-profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer token-completed'
        },
        body: JSON.stringify({
          studentProfileId: PROFILE_ID_COMPLETED
        })
      });

      assert.equal(res.status, 400);
      const data = await res.json();
      assert.match(data.error, /already completed/);
    });
  });

  // --------------------------------------------------------------------------
  // 4. Real Academic Records CGPA Persistence
  // --------------------------------------------------------------------------
  describe('4. Real Academic Semester CGPA Persistence', () => {
    test('Completed student can submit valid completed semester CGPA', async () => {
      // Student Completed is Year 3, Term 1.
      // Max completed semester = ((3 - 1) * 2) + 1 - 1 = 4.
      // Semester 4 is valid!
      const res = await fetch(`${baseUrl}/api/student/records`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer token-completed'
        },
        body: JSON.stringify({
          semesterNumber: 4,
          cumulativeCgpa: 8.75
        })
      });

      assert.equal(res.status, 201);
      const data = await res.json();
      assert.equal(data.success, true);
      assert.equal(data.data.semesterNumber, 4);
      assert.equal(data.data.cumulativeCgpa, 8.75);

      // Verify persistence in mock database
      const recId = 'rec-' + PROFILE_ID_COMPLETED + '-4';
      assert.equal(mockSemesterRecords[recId].cumulative_cgpa, 8.75);
    });

    test('Ongoing or future semester submission is rejected with 400', async () => {
      // Student Completed is Year 3, Term 1. Max completed sem is 4.
      // Submitting Semester 5 (ongoing/future) should be rejected!
      const res = await fetch(`${baseUrl}/api/student/records`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer token-completed'
        },
        body: JSON.stringify({
          semesterNumber: 5,
          cumulativeCgpa: 9.10
        })
      });

      assert.equal(res.status, 400);
      const data = await res.json();
      assert.equal(data.success, false);
      assert.match(data.error, /ongoing or future semester/);
    });

    test('Invalid semester number (0 or > 8) is rejected with 400', async () => {
      const res = await fetch(`${baseUrl}/api/student/records`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer token-completed'
        },
        body: JSON.stringify({
          semesterNumber: 9,
          cumulativeCgpa: 8.00
        })
      });

      assert.equal(res.status, 400);
      const data = await res.json();
      assert.equal(data.success, false);
      assert.match(data.error, /between 1 and 8/);
    });

    test('Invalid CGPA (< 0 or > 10) is rejected with 400', async () => {
      const res = await fetch(`${baseUrl}/api/student/records`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer token-completed'
        },
        body: JSON.stringify({
          semesterNumber: 2,
          cumulativeCgpa: 11.5
        })
      });

      assert.equal(res.status, 400);
      const data = await res.json();
      assert.equal(data.success, false);
      assert.match(data.error, /between 0.00 and 10.00/);
    });
  });

  // --------------------------------------------------------------------------
  // 5. First-Login Flow & Access Control Restrictions
  // --------------------------------------------------------------------------
  describe('5. First-Login Gate Restrictions', () => {
    test('Student with must_change_password = true cannot access dashboard or records', async () => {
      const resDash = await fetch(`${baseUrl}/api/student/dashboard`, {
        headers: { Authorization: 'Bearer token-student-a' }
      });
      assert.equal(resDash.status, 403);
      const dashData = await resDash.json();
      assert.equal(dashData.code, 'MUST_CHANGE_PASSWORD');

      const resRec = await fetch(`${baseUrl}/api/student/records`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer token-student-a'
        },
        body: JSON.stringify({ semesterNumber: 2, cumulativeCgpa: 8.5 })
      });
      assert.equal(resRec.status, 403);
      const recData = await resRec.json();
      assert.equal(recData.code, 'MUST_CHANGE_PASSWORD');
    });

    test('Student with null or missing must_change_password is strictly rejected with 403 MUST_CHANGE_PASSWORD', async () => {
      // Simulate database record having null must_change_password
      mockProfiles[PROFILE_ID_A].must_change_password = null;

      const resDash = await fetch(`${baseUrl}/api/student/dashboard`, {
        headers: { Authorization: 'Bearer token-student-a' }
      });
      assert.equal(resDash.status, 403);
      const dashData = await resDash.json();
      assert.equal(dashData.code, 'MUST_CHANGE_PASSWORD');

      const resComplete = await fetch(`${baseUrl}/api/student/complete-profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer token-student-a'
        },
        body: JSON.stringify({
          studentProfileId: PROFILE_ID_A,
          fullName: 'Test Student',
          email: 'test@mictech.ac.in',
          phoneNumber: '9876543210',
          location: 'Vijayawada',
          currentYear: 2,
          currentTerm: 1,
          qualificationType: 'intermediate',
          sscPercentage: 80,
          intermediatePercentage: 80
        })
      });
      assert.equal(resComplete.status, 403);
      const completeData = await resComplete.json();
      assert.equal(completeData.code, 'MUST_CHANGE_PASSWORD');
    });

    test('Student with must_change_password = false but incomplete profile cannot access records', async () => {
      const resRec = await fetch(`${baseUrl}/api/student/records`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer token-ready'
        },
        body: JSON.stringify({ semesterNumber: 2, cumulativeCgpa: 8.5 })
      });
      assert.equal(resRec.status, 403);
      const recData = await resRec.json();
      assert.equal(recData.code, 'PROFILE_COMPLETION_REQUIRED');
    });
  });

  describe('6. Student Profile Portfolio Persistence & Ownership', () => {
    test('Student successfully updates portfolio details through authenticated backend', async () => {
      const res = await fetch(`${baseUrl}/api/student/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer token-completed'
        },
        body: JSON.stringify({
          fullName: 'Updated Completed Student',
          phoneNumber: '9988776611',
          location: 'Kanchikacherla'
        })
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.success, true);
      assert.equal(data.data.full_name, 'Updated Completed Student');
      assert.equal(data.data.phone_number, '9988776611');
      assert.equal(data.data.location, 'Kanchikacherla');
    });

    test('Completed student can update academic standing (current_year, current_term) within valid bounds (2..4, 1..2)', async () => {
      const res = await fetch(`${baseUrl}/api/student/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer token-completed'
        },
        body: JSON.stringify({
          currentYear: 4,
          currentTerm: 2
        })
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.success, true);
      assert.equal(data.data.current_year, 4);
      assert.equal(data.data.current_term, 2);
      assert.equal(data.data.admission_year, 2023);
    });

    test('Student updating academic standing with invalid year/term is rejected with 400', async () => {
      const res = await fetch(`${baseUrl}/api/student/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer token-completed'
        },
        body: JSON.stringify({
          currentYear: 5,
          currentTerm: 1
        })
      });

      assert.equal(res.status, 400);
      const data = await res.json();
      assert.equal(data.success, false);
      assert.match(data.error, /Academic year must be between 2/i);
    });

    test('Student can save valid completed semester CGPAs via PUT /api/student/profile', async () => {
      const res = await fetch(`${baseUrl}/api/student/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer token-completed'
        },
        body: JSON.stringify({
          currentYear: 3,
          currentTerm: 2,
          semesterRecords: [
            { semNumber: 1, cgpa: 8.5 },
            { semNumber: 2, cgpa: 8.75 },
            { semNumber: 3, cgpa: 9.0 }
          ]
        })
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.success, true);
      assert.equal(data.data.current_year, 3);
      assert.equal(data.data.current_term, 2);
    });

    test('Student submitting future semester via PUT /api/student/profile is rejected with 400', async () => {
      const res = await fetch(`${baseUrl}/api/student/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer token-completed'
        },
        body: JSON.stringify({
          currentYear: 2,
          currentTerm: 1, // max completed is 2
          semesterRecords: [
            { semNumber: 4, cgpa: 8.5 } // semester 4 is future
          ]
        })
      });

      assert.equal(res.status, 400);
      const data = await res.json();
      assert.equal(data.success, false);
      assert.match(data.error, /ongoing or future semester|not yet eligible/i);
    });

    test('Unauthenticated request to PUT /api/student/profile is strictly rejected with 401', async () => {
      const res = await fetch(`${baseUrl}/api/student/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ fullName: 'Malicious Actor' })
      });

      assert.equal(res.status, 401);
    });

    test('Photo upload rejects empty or invalid binary data', async () => {
      const res = await fetch(`${baseUrl}/api/student/photo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer token-completed'
        },
        body: JSON.stringify({ photoData: 'data:image/jpeg;base64,invalid' })
      });

      assert.equal(res.status, 400);
      const data = await res.json();
      assert.equal(data.success, false);
      assert.match(data.error, /Invalid file content|No image/);
    });
  });
});

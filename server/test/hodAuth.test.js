import { test, describe, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import app from '../src/app.js';
import { setSupabaseAdminMock, resetSupabaseAdminMock } from '../src/config/supabaseAdmin.js';

let server;
let baseUrl;

// Sample Valid UUIDs
const HOD_USER_ID = '99999999-9999-4999-a999-999999999999';
const STUDENT_USER_ID = 'aaaa1111-1111-4111-a111-111111111111';
const STUDENT_PROFILE_ID = '11111111-1111-4111-a111-111111111111';

// In-Memory Test State
let mockUsers = {};
let mockRoles = {};
let mockProfiles = {};
let mockAuditLogs = [];
let failProfileInsert = false;
let deletedUserIds = [];

function initializeMockDatabase() {
  failProfileInsert = false;
  deletedUserIds = [];
  mockAuditLogs = [];

  mockUsers = {
    [HOD_USER_ID]: {
      id: HOD_USER_ID,
      email: 'hod.aiml@mictech.ac.in',
      user_metadata: { name: 'Dr. Thatibalamuralikrishna', role: 'hod' }
    },
    [STUDENT_USER_ID]: {
      id: STUDENT_USER_ID,
      email: '21b91a5401@student.aiml.mictech.ac.in',
      user_metadata: { registerNumber: '21B91A5401' }
    }
  };

  mockRoles = {
    [HOD_USER_ID]: { user_id: HOD_USER_ID, role: 'hod', is_active: true }
  };

  mockProfiles = {
    [STUDENT_PROFILE_ID]: {
      id: STUDENT_PROFILE_ID,
      user_id: STUDENT_USER_ID,
      register_number: '21B91A5401',
      full_name: 'Existing Student',
      email: '21b91a5401@student.aiml.mictech.ac.in',
      current_year: 3,
      current_term: 1,
      is_active: true,
      must_change_password: false,
      is_profile_completed: true
    }
  };
}

function createSupabaseMock() {
  return {
    auth: {
      getUser: async (token) => {
        if (token === 'HOD_TOKEN') {
          return { data: { user: mockUsers[HOD_USER_ID] }, error: null };
        }
        if (token === 'STUDENT_TOKEN') {
          return { data: { user: mockUsers[STUDENT_USER_ID] }, error: null };
        }
        return { data: { user: null }, error: { message: 'Invalid token' } };
      },
      signInWithPassword: async ({ email, password }) => {
        const user = Object.values(mockUsers).find((u) => u.email?.toLowerCase() === email?.toLowerCase());
        if (!user || password !== 'ValidPassword123') {
          return { data: null, error: { message: 'Invalid credentials' } };
        }
        const token = user.id === HOD_USER_ID ? 'HOD_TOKEN' : 'STUDENT_TOKEN';
        return {
          data: {
            user,
            session: { access_token: token, user }
          },
          error: null
        };
      },
      admin: {
        createUser: async ({ email, password, user_metadata }) => {
          const existing = Object.values(mockUsers).find((u) => u.email?.toLowerCase() === email?.toLowerCase());
          if (existing) {
            return { data: null, error: { message: 'User already registered' } };
          }
          const id = `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
          const user = { id, email, user_metadata };
          mockUsers[id] = user;
          return { data: { user }, error: null };
        },
        deleteUser: async (id) => {
          deletedUserIds.push(id);
          delete mockUsers[id];
          return { data: {}, error: null };
        }
      }
    },
    from: (table) => {
      let currentTable = table;
      let filters = {};

      const builder = {
        select: (cols) => builder,
        eq: (col, val) => {
          filters[col] = val;
          return builder;
        },
        ilike: (col, val) => {
          filters[col] = val;
          return builder;
        },
        order: () => builder,
        maybeSingle: async () => {
          if (currentTable === 'aiml_user_roles') {
            const role = mockRoles[filters.user_id];
            if (role && filters.role && role.role !== filters.role) return { data: null, error: null };
            return { data: role || null, error: null };
          }
          if (currentTable === 'aiml_student_profiles') {
            const profile = Object.values(mockProfiles).find((p) => {
              if (filters.user_id && p.user_id !== filters.user_id) return false;
              if (filters.register_number && p.register_number !== filters.register_number) return false;
              if (filters.id && p.id !== filters.id) return false;
              return true;
            });
            return { data: profile || null, error: null };
          }
          return { data: null, error: null };
        },
        single: async () => {
          return builder.maybeSingle();
        },
        insert: (records) => {
          if (currentTable === 'aiml_student_profiles' && failProfileInsert) {
            return {
              select: () => ({
                single: async () => ({ data: null, error: { message: 'Database insert failure' } })
              })
            };
          }
          const list = Array.isArray(records) ? records : [records];
          for (const item of list) {
            if (currentTable === 'aiml_student_profiles') {
              const id = item.id || `profile_${Date.now()}`;
              mockProfiles[id] = { id, ...item };
            } else if (currentTable === 'aiml_audit_logs') {
              mockAuditLogs.push(item);
            } else if (currentTable === 'aiml_user_roles') {
              mockRoles[item.user_id] = { ...item };
            }
          }
          return {
            select: () => ({
              single: async () => ({ data: list[0], error: null })
            })
          };
        },
        then: (resolve) => {
          if (currentTable === 'aiml_student_profiles') {
            resolve({ data: Object.values(mockProfiles), error: null });
          } else if (currentTable === 'aiml_user_roles') {
            resolve({ data: Object.values(mockRoles), error: null });
          } else {
            resolve({ data: [], error: null });
          }
        }
      };

      return builder;
    }
  };
}

describe('HOD & Student Authentication and Role Management Suite', () => {
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
    initializeMockDatabase();
    setSupabaseAdminMock(createSupabaseMock());
  });

  test('1. HOD Authentication: Logs in successfully with verified hod role', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'hod.aiml@mictech.ac.in', password: 'ValidPassword123' })
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.user.role, 'hod');
    assert.equal(body.token, 'HOD_TOKEN');
  });

  test('2. HOD Role Verification: Rejects non-HOD user attempting HOD login', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: '21b91a5401@student.aiml.mictech.ac.in', password: 'ValidPassword123' })
    });

    assert.equal(res.status, 403);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.match(body.error, /HOD/i);
  });

  test('3. Student Login: Authenticates using Register Number + Password', async () => {
    const res = await fetch(`${baseUrl}/api/auth/student-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ registerNumber: '21B91A5401', password: 'ValidPassword123' })
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.token, 'STUDENT_TOKEN');
    assert.equal(body.profile.registerNumber, '21B91A5401');
  });

  test('4. Route Protection: Student token is strictly rejected from HOD routes', async () => {
    const res = await fetch(`${baseUrl}/api/hod/students`, {
      method: 'GET',
      headers: {
        Authorization: 'Bearer STUDENT_TOKEN'
      }
    });

    assert.equal(res.status, 403);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.match(body.error, /HOD/i);
  });

  test('5. Student Account Creation: HOD provisions account with mandatory initial flags', async () => {
    const res = await fetch(`${baseUrl}/api/hod/students`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer HOD_TOKEN'
      },
      body: JSON.stringify({
        registerNumber: '22H71A6199',
        initialPassword: 'TempPassword123'
      })
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.student.registerNumber, '22H71A6199');
    assert.equal(body.student.mustChangePassword, true);
    assert.equal(body.student.isProfileCompleted, false);
  });

  test('6. Duplicate Rejection: Rejects duplicate student Register Number', async () => {
    const res = await fetch(`${baseUrl}/api/hod/students`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer HOD_TOKEN'
      },
      body: JSON.stringify({
        registerNumber: '21B91A5401',
        initialPassword: 'TempPassword123'
      })
    });

    assert.equal(res.status, 409);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.match(body.error, /already exists/i);
  });

  test('7. Compensating Rollback: Deletes Auth user if database profile insertion fails', async () => {
    failProfileInsert = true;

    const res = await fetch(`${baseUrl}/api/hod/students`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer HOD_TOKEN'
      },
      body: JSON.stringify({
        registerNumber: '22H71A6188',
        initialPassword: 'TempPassword123'
      })
    });

    assert.equal(res.status, 500);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.match(body.error, /rolled back/i);

    // Verify rollback deleted the created Auth account
    assert.equal(deletedUserIds.length, 1);
  });
});

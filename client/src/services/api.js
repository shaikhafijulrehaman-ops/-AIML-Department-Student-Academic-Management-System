/**
 * API Service for AIML Department Academic Management System
 * Handles communication with Express REST API and provides seamless fallback to Supabase Client
 */

import { supabase } from './supabaseClient';

// Official Production Render Backend URL:
const DEFAULT_RENDER_BACKEND_URL = 'https://aiml-department-student-academic.onrender.com';

const RAW_API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// Ensure API_BASE_URL never has a trailing slash or trailing /api
const sanitizeBaseUrl = (raw) => {
  if (!raw) return '';
  let url = String(raw).trim().replace(/\/+$/, '');
  if (url.endsWith('/api')) {
    url = url.slice(0, -4);
  }
  return url;
};

// Use explicit env var if set, otherwise use official Render backend in production or relative /api proxy in development
export const API_BASE_URL = RAW_API_BASE_URL !== undefined 
  ? (RAW_API_BASE_URL === '/api' ? '' : sanitizeBaseUrl(RAW_API_BASE_URL))
  : (import.meta.env.PROD ? DEFAULT_RENDER_BACKEND_URL : '');

/**
 * Builds a clean, fully-qualified API URL guaranteeing /api is prefixed exactly once.
 */
export const buildApiUrl = (endpoint) => {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const normalizedEndpoint = cleanEndpoint.startsWith('/api/') || cleanEndpoint === '/api'
    ? cleanEndpoint
    : `/api${cleanEndpoint}`;

  if (!API_BASE_URL) {
    return normalizedEndpoint;
  }
  return `${API_BASE_URL}${normalizedEndpoint}`;
};

const TOKEN_KEY = 'aiml_auth_token';
const REFRESH_TOKEN_KEY = 'aiml_refresh_token';

export const getAuthToken = () => {
  return localStorage.getItem(TOKEN_KEY) || '';
};

export const getRefreshToken = () => {
  return localStorage.getItem(REFRESH_TOKEN_KEY) || '';
};

export const setAuthToken = (token, refreshToken = null) => {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
    if (refreshToken) {
      localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    }
    // Synchronize Supabase Client session for RLS queries and auto-refresh
    if (supabase?.auth?.setSession) {
      const activeRefresh = refreshToken || localStorage.getItem(REFRESH_TOKEN_KEY);
      if (activeRefresh) {
        supabase.auth.setSession({
          access_token: token,
          refresh_token: activeRefresh
        }).catch(() => {});
      }
    }
  } else {
    localStorage.removeItem(TOKEN_KEY);
    if (refreshToken === null) {
      localStorage.removeItem(REFRESH_TOKEN_KEY);
    }
  }
};

export const clearAuthToken = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  if (supabase?.auth?.signOut) {
    supabase.auth.signOut().catch(() => {});
  }
};

let refreshPromise = null;
export const refreshAuthSession = async () => {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    try {
      const refreshToken = getRefreshToken();
      if (!refreshToken) {
        return { success: false, error: 'No refresh token available.' };
      }

      // Try backend endpoint first
      const res = await fetch(buildApiUrl('/auth/refresh'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ refreshToken })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.token) {
        setAuthToken(data.token, data.refreshToken || refreshToken);
        return { success: true, token: data.token, refreshToken: data.refreshToken };
      }

      // Fallback: direct Supabase client refresh
      if (supabase?.auth?.refreshSession) {
        const { data: sData, error: sErr } = await supabase.auth.refreshSession({ refresh_token: refreshToken });
        if (!sErr && sData?.session?.access_token) {
          setAuthToken(sData.session.access_token, sData.session.refresh_token);
          return { success: true, token: sData.session.access_token, refreshToken: sData.session.refresh_token };
        }
      }

      clearAuthToken();
      return { success: false, error: data.error || 'Session refresh failed.' };
    } catch (err) {
      clearAuthToken();
      return { success: false, error: err.message || 'Session refresh error.' };
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
};

const request = async (endpoint, options = {}) => {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  const url = buildApiUrl(endpoint);
  try {
    const res = await fetch(url, {
      ...options,
      headers
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      // If 401 Unauthorized and not retried yet, try token refresh
      if (res.status === 401 && !options._retried && getRefreshToken()) {
        const refreshRes = await refreshAuthSession();
        if (refreshRes.success && refreshRes.token) {
          return request(endpoint, {
            ...options,
            _retried: true,
            headers: {
              ...(options.headers || {}),
              'Authorization': `Bearer ${refreshRes.token}`
            }
          });
        }
      }
      const errorMsg = data.error || data.message || `Request failed with status ${res.status}`;
      return { success: false, status: res.status, error: errorMsg, code: data.code };
    }
    return { success: true, ...data };
  } catch (err) {
    return { success: false, fallback: true, error: err.message || 'Network request failed' };
  }
};

export const checkBackendHealth = async () => {
  return request('/api/health', { method: 'GET' });
};

// Helper: Deterministic student email
const getDeterministicStudentEmail = (regNo) => {
  const clean = String(regNo).trim().toUpperCase();
  return `${clean.toLowerCase()}@student.aiml.mictech.ac.in`;
};

// ==========================================
// AUTHENTICATION APIS (Dual Mode: Express / Supabase Direct)
// ==========================================

export const loginHOD = async ({ email, password }) => {
  // 1. Try Express backend
  const res = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });
  if (res.success && res.token) {
    setAuthToken(res.token, res.refreshToken);
    return res;
  }
  // Return server response directly if it responded with an authentication status (e.g. 401, 403, 400)
  if (!res.fallback && res.status !== 405 && res.status !== 404) {
    return res;
  }

  // 2. Direct Supabase Auth fallback (when frontend is deployed alone on Vercel)
  try {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password: password
    });

    if (authError || !authData?.user || !authData?.session) {
      return {
        success: false,
        error: authError?.message || 'Invalid email or password.'
      };
    }

    const token = authData.session.access_token;
    const refreshToken = authData.session.refresh_token;
    setAuthToken(token, refreshToken);

    // Verify HOD role in database
    const { data: roleRecord, error: roleError } = await supabase
      .from('aiml_user_roles')
      .select('role, is_active')
      .eq('user_id', authData.user.id)
      .maybeSingle();

    if (roleError || !roleRecord || roleRecord.role !== 'hod' || !roleRecord.is_active) {
      await supabase.auth.signOut();
      clearAuthToken();
      return {
        success: false,
        error: 'Access denied: You do not possess active HOD administrative permissions.'
      };
    }

    return {
      success: true,
      message: 'HOD authenticated successfully.',
      token,
      refreshToken,
      user: {
        id: authData.user.id,
        email: authData.user.email,
        role: 'hod',
        name: authData.user.user_metadata?.name || 'Dr. Thatibalamuralikrishna'
      }
    };
  } catch (err) {
    return { success: false, error: err.message || 'Authentication failed' };
  }
};

export const loginStudent = async ({ registerNumber, password }) => {
  const cleanRegNo = String(registerNumber).trim().toUpperCase();

  // 1. Try Express backend
  const res = await request('/api/auth/student-login', {
    method: 'POST',
    body: JSON.stringify({ registerNumber: cleanRegNo, password })
  });
  if (res.success && res.token) {
    setAuthToken(res.token, res.refreshToken);
    return res;
  }
  // Return server response directly if it responded with an authentication status (e.g. 401, 403, 400)
  if (!res.fallback && res.status !== 405 && res.status !== 404) {
    return res;
  }

  // 2. Direct Supabase Auth fallback
  try {
    const email = getDeterministicStudentEmail(cleanRegNo);
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (authError || !authData?.user || !authData?.session) {
      return {
        success: false,
        error: authError?.message || 'Invalid Register Number or password.'
      };
    }

    const token = authData.session.access_token;
    const refreshToken = authData.session.refresh_token;
    setAuthToken(token, refreshToken);

    // Fetch and strictly verify student profile
    const { data: profile, error: profileError } = await supabase
      .from('aiml_student_profiles')
      .select('*')
      .eq('user_id', authData.user.id)
      .maybeSingle();

    if (profileError || !profile || !profile.is_active) {
      await supabase.auth.signOut();
      clearAuthToken();
      return {
        success: false,
        error: 'Access denied: Your student account is inactive or not found.'
      };
    }

    return {
      success: true,
      message: 'Student authenticated successfully.',
      token,
      user: {
        id: authData.user.id,
        role: 'student',
        registerNumber: cleanRegNo,
        studentProfile: profile
      },
      profile
    };
  } catch (err) {
    return { success: false, error: err.message || 'Authentication failed' };
  }
};

export const getCurrentUser = async () => {
  // Always query backend first for verified session and roles
  const res = await request('/api/auth/me', { method: 'GET' });
  if (res.success) return res;
  if (!res.fallback && res.status !== 404 && res.status !== 405) {
    return res;
  }

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      return { success: false, error: 'No active session' };
    }

    const user = session.user;
    const { data: roleRecord } = await supabase
      .from('aiml_user_roles')
      .select('role, is_active')
      .eq('user_id', user.id)
      .maybeSingle();

    if (roleRecord?.role === 'hod' && roleRecord?.is_active) {
      return {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          role: 'hod'
        }
      };
    }

    const { data: profile } = await supabase
      .from('aiml_student_profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (profile && profile.is_active) {
      return {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          role: 'student',
          studentProfile: profile
        }
      };
    }

    return { success: false, error: 'User does not possess an active role.' };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

// ==========================================
// HOD MANAGEMENT APIS
// ==========================================

export const fetchHodStudents = async (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.year) params.append('year', filters.year);
  if (filters.term) params.append('term', filters.term);
  if (filters.status) params.append('status', filters.status);
  if (filters.search) params.append('search', filters.search);
  const query = params.toString() ? `?${params.toString()}` : '';
  const res = await request(`/api/hod/students${query}`, { method: 'GET' });
  if (res.success || (!res.fallback && res.status !== 404 && res.status !== 405)) {
    const list = res.students || res.data || [];
    return { ...res, students: list, data: list };
  }

  try {
    const { data, error } = await supabase
      .from('aiml_student_profiles')
      .select('*, aiml_semester_records(*)');
    if (error) return { success: false, error: error.message };
    return { success: true, students: data || [], data: data || [] };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

export const fetchHodStudentDetails = async (id) => {
  return request(`/api/hod/students/${id}`, { method: 'GET' });
};

export const createStudentAccount = async ({ registerNumber, initialPassword }) => {
  return request('/api/hod/students', {
    method: 'POST',
    body: JSON.stringify({ registerNumber, initialPassword })
  });
};

export const toggleStudentStatus = async (id, isActive) => {
  return request(`/api/hod/students/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ is_active: isActive })
  });
};

export const updateStudentAcademic = async (id, currentYear, currentTerm) => {
  return request(`/api/hod/students/${id}/academic`, {
    method: 'PATCH',
    body: JSON.stringify({ current_year: currentYear, current_term: currentTerm })
  });
};

export const createCampaign = async (campaignData) => {
  return request('/api/hod/campaigns', {
    method: 'POST',
    body: JSON.stringify(campaignData)
  });
};

export const fetchCampaigns = async () => {
  const res = await request('/api/hod/campaigns', { method: 'GET' });
  if (res.success || (!res.fallback && res.status !== 404 && res.status !== 405)) {
    return res;
  }

  try {
    const { data, error } = await supabase
      .from('aiml_update_campaigns')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) return { success: false, error: error.message };
    return { success: true, campaigns: data || [] };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

export const fetchAnalytics = async () => {
  return request('/api/hod/analytics', { method: 'GET' });
};

// ==========================================
// STUDENT ACTIONS APIS
// ==========================================

export const changeInitialPassword = async (newPassword) => {
  // Always invoke backend password change endpoint to verify token and sync database flags
  const res = await request('/api/student/change-initial-password', {
    method: 'POST',
    body: JSON.stringify({ newPassword })
  });
  if (res.success && res.token) {
    setAuthToken(res.token, res.refreshToken);
  }
  return res;
};

export const completeStudentProfile = async (studentProfileId, profileData) => {
  return request('/api/student/complete-profile', {
    method: 'POST',
    body: JSON.stringify({ studentProfileId, ...profileData })
  });
};

export const updateStudentProfile = async (profileData) => {
  return request('/api/student/profile', {
    method: 'PUT',
    body: JSON.stringify(profileData)
  });
};

export const uploadStudentPhoto = async (fileOrFormData) => {
  const url = buildApiUrl('/student/photo');

  const makeAttempt = async (authToken) => {
    let body;
    let headers = {
      'Accept': 'application/json',
      ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {})
    };

    if (fileOrFormData instanceof FormData) {
      body = fileOrFormData;
    } else if (typeof fileOrFormData === 'object' && fileOrFormData !== null && (fileOrFormData instanceof File || fileOrFormData instanceof Blob)) {
      const formData = new FormData();
      formData.append('photo', fileOrFormData);
      body = formData;
    } else if (typeof fileOrFormData === 'string') {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify({ photoData: fileOrFormData });
    } else {
      return { success: false, error: 'Invalid photo payload provided.' };
    }

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        success: false,
        status: res.status,
        error: data.error || data.message || `Photo upload failed with status ${res.status}`
      };
    }
    return { success: true, ...data };
  };

  try {
    let token = getAuthToken();
    let result = await makeAttempt(token);

    // If 401 Unauthorized, automatically attempt token refresh and retry once
    if (!result.success && result.status === 401 && getRefreshToken()) {
      const refreshRes = await refreshAuthSession();
      if (refreshRes.success && refreshRes.token) {
        result = await makeAttempt(refreshRes.token);
      }
    }
    return result;
  } catch (err) {
    return { success: false, error: err.message || 'Network error uploading profile photo.' };
  }
};

export const submitSemesterRecord = async ({ semesterNumber, cumulativeCgpa }) => {
  return request('/api/student/records', {
    method: 'POST',
    body: JSON.stringify({ semesterNumber, cumulativeCgpa })
  });
};

export const fetchStudentRecords = async () => {
  return request('/api/student/records', { method: 'GET' });
};

export const fetchStudentCampaigns = async () => {
  return request('/api/student/campaigns', { method: 'GET' });
};

export const resetStudentPassword = async (studentId) => {
  return request(`/api/hod/students/${studentId}/reset-password`, {
    method: 'POST'
  });
};

export const updateStudentStatus = async (studentId, isActive) => {
  return request(`/api/hod/students/${studentId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ isActive })
  });
};

export const deleteStudentAccount = async (studentId, confirmationRegisterNumber) => {
  return request(`/api/hod/students/${studentId}`, {
    method: 'DELETE',
    body: JSON.stringify({ confirmationRegisterNumber })
  });
};

export const fetchStudentById = async (studentId) => {
  return request(`/api/hod/students/${studentId}`, {
    method: 'GET'
  });
};

/**
 * API Service for AIML Department Academic Management System
 * Handles communication with Express REST API and provides seamless fallback to Supabase Client
 */

import { supabase } from './supabaseClient';

// Official Production Render Backend URL:
const DEFAULT_RENDER_BACKEND_URL = 'https://aiml-department-student-academic.onrender.com';

const RAW_API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
// Use explicit env var if set, otherwise use official Render backend in production or relative /api proxy in development
const API_BASE_URL = RAW_API_BASE_URL !== undefined 
  ? (RAW_API_BASE_URL === '/api' ? '' : RAW_API_BASE_URL)
  : (import.meta.env.PROD ? DEFAULT_RENDER_BACKEND_URL : '');

const TOKEN_KEY = 'aiml_auth_token';

export const getAuthToken = () => {
  return localStorage.getItem(TOKEN_KEY) || '';
};

export const setAuthToken = (token) => {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
};

export const clearAuthToken = () => {
  localStorage.removeItem(TOKEN_KEY);
};

const request = async (endpoint, options = {}) => {
  if (!API_BASE_URL) {
    // No external backend URL configured (e.g. standalone Vercel frontend)
    return { success: false, fallback: true, error: 'No backend API URL configured.' };
  }

  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  const url = `${API_BASE_URL}${endpoint}`;
  try {
    const res = await fetch(url, {
      ...options,
      headers
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
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
  // 1. Try Express backend if configured
  if (API_BASE_URL) {
    const res = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    if (res.success && res.token) {
      setAuthToken(res.token);
      return res;
    }
    if (!res.fallback && res.status !== 405 && res.status !== 404) {
      return res;
    }
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
    setAuthToken(token);

    // Verify HOD role in database if table exists
    const { data: roleRecord } = await supabase
      .from('aiml_user_roles')
      .select('role')
      .eq('user_id', authData.user.id)
      .maybeSingle();

    return {
      success: true,
      message: 'HOD authenticated successfully.',
      token,
      user: {
        id: authData.user.id,
        email: authData.user.email,
        role: roleRecord?.role || 'hod',
        name: authData.user.user_metadata?.name || 'Dr. Thatibalamuralikrishna'
      }
    };
  } catch (err) {
    return { success: false, error: err.message || 'Authentication failed' };
  }
};

export const loginStudent = async ({ registerNumber, password }) => {
  const cleanRegNo = String(registerNumber).trim().toUpperCase();

  // 1. Try Express backend if configured
  if (API_BASE_URL) {
    const res = await request('/api/auth/student-login', {
      method: 'POST',
      body: JSON.stringify({ registerNumber: cleanRegNo, password })
    });
    if (res.success && res.token) {
      setAuthToken(res.token);
      return res;
    }
    if (!res.fallback && res.status !== 405 && res.status !== 404) {
      return res;
    }
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
    setAuthToken(token);

    // Fetch student profile
    const { data: profile } = await supabase
      .from('aiml_student_profiles')
      .select('*')
      .eq('user_id', authData.user.id)
      .maybeSingle();

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
  if (API_BASE_URL) {
    const res = await request('/api/auth/me', { method: 'GET' });
    if (res.success) return res;
  }

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      return { success: false, error: 'No active session' };
    }

    const user = session.user;
    const { data: roleRecord } = await supabase
      .from('aiml_user_roles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();

    let studentProfile = null;
    if (roleRecord?.role !== 'hod') {
      const { data: profile } = await supabase
        .from('aiml_student_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      studentProfile = profile;
    }

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: roleRecord?.role || (studentProfile ? 'student' : 'hod'),
        studentProfile
      }
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

// ==========================================
// HOD MANAGEMENT APIS
// ==========================================

export const fetchHodStudents = async (filters = {}) => {
  if (API_BASE_URL) {
    const params = new URLSearchParams();
    if (filters.year) params.append('year', filters.year);
    if (filters.term) params.append('term', filters.term);
    if (filters.status) params.append('status', filters.status);
    if (filters.search) params.append('search', filters.search);
    const query = params.toString() ? `?${params.toString()}` : '';
    const res = await request(`/api/hod/students${query}`, { method: 'GET' });
    if (res.success) return res;
  }

  try {
    const { data, error } = await supabase
      .from('aiml_student_profiles')
      .select('*, aiml_semester_records(*)');
    if (error) return { success: false, error: error.message };
    return { success: true, students: data || [] };
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
  if (API_BASE_URL) {
    const res = await request('/api/hod/campaigns', { method: 'GET' });
    if (res.success) return res;
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
  if (API_BASE_URL) {
    const res = await request('/api/student/change-initial-password', {
      method: 'POST',
      body: JSON.stringify({ newPassword })
    });
    if (res.success) return res;
  }

  try {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

export const completeStudentProfile = async (studentProfileId, profileData) => {
  return request('/api/student/complete-profile', {
    method: 'POST',
    body: JSON.stringify({ studentProfileId, ...profileData })
  });
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

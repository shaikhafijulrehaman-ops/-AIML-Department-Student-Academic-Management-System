/**
 * API Service for AIML Department Academic Management System
 * Connects frontend React client to Express REST API with Supabase Auth
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

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
    return { success: false, error: err.message || 'Network request failed' };
  }
};

export const checkBackendHealth = async () => {
  return request('/api/health', { method: 'GET' });
};

// ==========================================
// AUTHENTICATION APIS
// ==========================================

export const loginHOD = async ({ email, password }) => {
  const res = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });
  if (res.success && res.token) {
    setAuthToken(res.token);
  }
  return res;
};

export const loginStudent = async ({ registerNumber, password }) => {
  const res = await request('/api/auth/student-login', {
    method: 'POST',
    body: JSON.stringify({ registerNumber, password })
  });
  if (res.success && res.token) {
    setAuthToken(res.token);
  }
  return res;
};

export const getCurrentUser = async () => {
  const res = await request('/api/auth/me', { method: 'GET' });
  return res;
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
  return request(`/api/hod/students${query}`, { method: 'GET' });
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
  return request('/api/hod/campaigns', { method: 'GET' });
};

export const fetchAnalytics = async () => {
  return request('/api/hod/analytics', { method: 'GET' });
};

// ==========================================
// STUDENT ACTIONS APIS
// ==========================================

export const changeInitialPassword = async (newPassword) => {
  return request('/api/student/change-initial-password', {
    method: 'POST',
    body: JSON.stringify({ newPassword })
  });
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

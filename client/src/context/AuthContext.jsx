import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as api from '../services/api';
import { getMaxCompletedSemForTerm, getTermsForYear } from '../data/mockData';
import { getBatchLabel, getAcademicYearDisplay } from '../utils/academicYearMapping';

const AuthContext = createContext(null);

const STORAGE_KEYS = {
  AUTH_ROLE: 'aiml_auth_role',
  ACTIVE_STUDENT_ID: 'aiml_active_student_id',
};

export const AuthProvider = ({ children }) => {
  const [currentRole, setCurrentRole] = useState(() => {
    return localStorage.getItem(STORAGE_KEYS.AUTH_ROLE) || null;
  });

  const [loading, setLoading] = useState(true);

  // Official HOD Profile (persisted per DVR & Dr. HS MIC College of Technology standards)
  const [hodUser] = useState({
    name: 'Dr. Thatibalamuralikrishna',
    title: 'Professor & Head of Department',
    department: 'Department of Artificial Intelligence and Machine Learning',
    email: 'hod.aiml@mictech.ac.in',
    cabin: 'Room #204, Tech Block',
    role: 'Head of Department'
  });

  // State managed from database API
  const [students, setStudents] = useState([]);
  const [updateRequests, setUpdateRequests] = useState([]);
  const [activeStudent, setActiveStudent] = useState(null);
  const [analytics, setAnalytics] = useState(null);

  // Initialize session from backend token if present
  useEffect(() => {
    const initializeAuth = async () => {
      const token = api.getAuthToken();
      if (!token) {
        setLoading(false);
        return;
      }

      const res = await api.getCurrentUser();
      if (res.success) {
        const role = res.user?.role === 'hod' ? 'admin' : 'student';
        setCurrentRole(role);
        localStorage.setItem(STORAGE_KEYS.AUTH_ROLE, role);

        const profile = res.profile || res.user?.studentProfile;
        if (role === 'student' && profile) {
          const cy = profile.current_year || profile.currentYear;
          const ct = profile.current_term || profile.currentTerm;
          setActiveStudent({
            id: profile.id,
            registerNumber: profile.register_number || profile.registerNumber,
            name: profile.full_name || profile.fullName || 'Profile Pending',
            email: profile.email,
            phone: profile.phone_number || profile.phoneNumber,
            location: profile.location,
            currentYear: cy,
            currentTerm: ct,
            year: cy ? getAcademicYearDisplay(cy) : 'Not Provided',
            batch: cy ? getBatchLabel(cy) : 'Academic Batch Pending',
            term: (cy && ct) ? `${cy}-${ct}` : 'Not Provided',
            sscPercentage: profile.ssc_percentage || profile.sscPercentage,
            interType: profile.qualification_type || profile.qualificationType,
            interPercentage: profile.intermediate_percentage || profile.intermediatePercentage,
            profilePhoto: profile.profile_photo_url || profile.profilePhotoUrl || profile.profile_photo_path || profile.profilePhotoPath,
            profilePhotoPath: profile.profile_photo_path || profile.profilePhotoPath,
            mustChangePassword: Boolean(profile.must_change_password ?? profile.mustChangePassword ?? true),
            onboardingStatus: (profile.is_profile_completed || profile.isProfileCompleted) ? 'Profile Completed' : 'Profile Pending',
            studentStatus: (profile.is_active || profile.isActive) ? 'Active' : 'Inactive',
            semesterRecords: profile.semester_records || []
          });
        }
      } else {
        // Token invalid or expired
        api.clearAuthToken();
        setCurrentRole(null);
        localStorage.removeItem(STORAGE_KEYS.AUTH_ROLE);
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  // Fetch HOD data if role is admin
  const refreshHodData = useCallback(async () => {
    if (currentRole !== 'admin') return;
    const [studentsRes, campaignsRes, analyticsRes] = await Promise.all([
      api.fetchHodStudents(),
      api.fetchCampaigns(),
      api.fetchAnalytics()
    ]);

    const rawStudents = studentsRes?.students || studentsRes?.data || [];
    if (studentsRes?.success && Array.isArray(rawStudents)) {
      // Map API schema to UI expectations
      const mapped = rawStudents.map((s) => ({
        id: s.id,
        registerNumber: s.register_number,
        name: s.full_name || 'Profile Pending',
        email: s.email,
        phone: s.phone_number,
        location: s.location,
        year: s.current_year ? getAcademicYearDisplay(s.current_year) : 'Not Provided',
        batch: s.current_year ? getBatchLabel(s.current_year) : 'Academic Batch Pending',
        term: (s.current_year && s.current_term) ? `${s.current_year}-${s.current_term}` : 'Not Provided',
        currentYear: s.current_year,
        currentTerm: s.current_term,
        sscPercentage: s.ssc_percentage,
        interType: s.qualification_type,
        interPercentage: s.intermediate_percentage,
        profilePhoto: s.profile_photo_url || s.profile_photo_path,
        profilePhotoPath: s.profile_photo_path,
        mustChangePassword: Boolean(s.must_change_password),
        onboardingStatus: s.is_profile_completed ? 'Profile Completed' : 'Profile Pending',
        studentStatus: s.is_active ? 'Active' : 'Inactive',
        semesterRecords: (s.aiml_semester_records || []).map((r) => ({
          term: `Semester ${r.semester_number}`,
          semesterNumber: r.semester_number,
          cgpa: r.cumulative_cgpa,
          status: 'Updated',
          submittedAt: r.submitted_at
        }))
      }));
      setStudents(mapped);
    }

    if (campaignsRes.success && Array.isArray(campaignsRes.campaigns)) {
      const mappedReqs = campaignsRes.campaigns.map((c) => ({
        id: c.id,
        title: c.title,
        targetYear: `Year ${c.target_year}`,
        targetSemester: `Semester ${c.target_semester}`,
        instructions: c.instructions,
        deadline: c.deadline,
        status: c.is_active ? 'Active' : 'Closed',
        createdAt: c.created_at ? c.created_at.split('T')[0] : '',
        submittedCount: c.submitted_count || 0,
        pendingCount: c.pending_count || 0
      }));
      setUpdateRequests(mappedReqs);
    }

    if (analyticsRes.success) {
      setAnalytics(analyticsRes.analytics);
    }
  }, [currentRole]);

  useEffect(() => {
    if (currentRole === 'admin') {
      refreshHodData();
    }
  }, [currentRole, refreshHodData]);

  // Login as HOD / Admin
  const loginAsAdmin = async (email, password) => {
    if (!email || !password) {
      return { success: false, error: 'Please enter both Email and Password.' };
    }

    const res = await api.loginHOD({ email: email.trim(), password: password.trim() });
    if (res.success) {
      setCurrentRole('admin');
      localStorage.setItem(STORAGE_KEYS.AUTH_ROLE, 'admin');
      await refreshHodData();
      return { success: true };
    }
    return { success: false, error: res.error || 'Authentication failed' };
  };

  // Login as Student
  const loginAsStudent = async (registerNumber, password) => {
    if (!registerNumber || !password) {
      return { success: false, error: 'Please enter Register Number and Password.' };
    }

    const res = await api.loginStudent({
      registerNumber: registerNumber.trim(),
      password: password.trim()
    });

    if (res.success) {
      setCurrentRole('student');
      localStorage.setItem(STORAGE_KEYS.AUTH_ROLE, 'student');

      const profile = res.profile || res.user?.studentProfile;
      if (profile) {
        const cy = profile.current_year || profile.currentYear;
        const ct = profile.current_term || profile.currentTerm;
        const studentObj = {
          id: profile.id,
          registerNumber: profile.register_number || profile.registerNumber,
          name: profile.full_name || profile.fullName || 'Profile Pending',
          email: profile.email,
          phone: profile.phone_number || profile.phoneNumber,
          location: profile.location,
          currentYear: cy,
          currentTerm: ct,
          year: cy ? getAcademicYearDisplay(cy) : 'Not Provided',
          batch: cy ? getBatchLabel(cy) : 'Academic Batch Pending',
          term: (cy && ct) ? `${cy}-${ct}` : 'Not Provided',
          sscPercentage: profile.ssc_percentage || profile.sscPercentage,
          interType: profile.qualification_type || profile.qualificationType,
          interPercentage: profile.intermediate_percentage || profile.intermediatePercentage,
          profilePhoto: profile.profile_photo_url || profile.profilePhotoUrl || profile.profile_photo_path || profile.profilePhotoPath,
          profilePhotoPath: profile.profile_photo_path || profile.profilePhotoPath,
          mustChangePassword: Boolean(profile.must_change_password ?? profile.mustChangePassword ?? true),
          onboardingStatus: (profile.is_profile_completed || profile.isProfileCompleted) ? 'Profile Completed' : 'Profile Pending',
          studentStatus: (profile.is_active || profile.isActive) ? 'Active' : 'Inactive',
          semesterRecords: (profile.semester_records || profile.aiml_semester_records || []).map((r) => ({
            term: `Semester ${r.semester_number}`,
            semesterNumber: r.semester_number,
            cgpa: r.cumulative_cgpa,
            status: 'Updated',
            submittedAt: r.submitted_at
          }))
        };
        setActiveStudent(studentObj);
        return {
          success: true,
          student: studentObj,
          mustChangePassword: Boolean(profile.must_change_password ?? profile.mustChangePassword ?? true),
          onboardingStatus: (profile.is_profile_completed || profile.isProfileCompleted) ? 'Profile Completed' : 'Profile Pending'
        };
      }
      return { success: true };
    }

    return { success: false, error: res.error || 'Authentication failed.' };
  };

  // Create Student Account by HOD
  const createStudentAccount = async ({ registerNumber, initialPassword }) => {
    if (!registerNumber || !initialPassword) {
      return { success: false, error: 'Register Number and Initial Password are required.' };
    }

    const res = await api.createStudentAccount({
      registerNumber: registerNumber.trim().toUpperCase(),
      initialPassword: initialPassword.trim()
    });

    if (res.success) {
      await refreshHodData();
      return { success: true, student: res.student };
    }
    return { success: false, error: res.error || 'Failed to create student account' };
  };

  // Student changes initial password
  const changeStudentPassword = async (studentId, newPassword) => {
    const res = await api.changeInitialPassword(newPassword);
    if (res.success) {
      setActiveStudent((prev) => (prev ? { ...prev, mustChangePassword: false } : prev));
      return { success: true };
    }
    return { success: false, error: res.error || 'Password update failed.' };
  };

  // Student completes onboarding profile
  const completeStudentOnboarding = async (studentId, profileData) => {
    const targetId = studentId || activeStudent?.id;
    const res = await api.completeStudentProfile(targetId, profileData);
    if (res.success) {
      setActiveStudent((prev) => ({
        ...prev,
        ...profileData,
        onboardingStatus: 'Profile Completed',
        studentStatus: 'Active',
        mustChangePassword: false
      }));
      return { success: true };
    }
    return { success: false, error: res.error || 'Profile completion failed' };
  };

  // Student updates profile details (My Portfolio)
  const updateStudentProfile = async (studentId, profileData) => {
    const res = await api.updateStudentProfile(profileData);
    if (res.success) {
      const serverData = res.data || {};
      setActiveStudent((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          name: serverData.full_name || profileData.name || profileData.fullName || prev.name,
          email: serverData.email ?? profileData.email ?? prev.email,
          phone: serverData.phone_number ?? profileData.phone ?? profileData.phoneNumber ?? prev.phone,
          location: serverData.location ?? profileData.location ?? prev.location,
          sscPercentage: serverData.ssc_percentage ?? profileData.sscPercentage ?? prev.sscPercentage,
          interType: serverData.qualification_type ?? profileData.qualificationType ?? profileData.interType ?? prev.interType,
          interPercentage: serverData.intermediate_percentage ?? profileData.intermediatePercentage ?? profileData.interPercentage ?? prev.interPercentage,
          profilePhoto: serverData.profile_photo_url || res.signedUrl || prev.profilePhoto
        };
      });
      return { success: true, data: res.data };
    }
    return { success: false, error: res.error || 'Failed to update student profile.' };
  };

  // Student uploads profile photo to Supabase Storage
  const uploadStudentPhoto = async (fileOrFormData) => {
    const res = await api.uploadStudentPhoto(fileOrFormData);
    if (res.success) {
      setActiveStudent((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          profilePhoto: res.signedUrl || prev.profilePhoto,
          profilePhotoPath: res.profilePhotoPath || prev.profilePhotoPath
        };
      });
      return { success: true, signedUrl: res.signedUrl, profilePhotoPath: res.profilePhotoPath };
    }
    return { success: false, error: res.error || 'Failed to upload photo.' };
  };

  // Student updates academic details (SSC, Inter, CGPAs)
  const updateStudentAcademicDetails = async (studentId, academicData) => {
    const res = await api.updateStudentProfile(academicData);
    if (res.success) {
      setActiveStudent((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          sscPercentage: academicData.sscPercentage ?? prev.sscPercentage,
          interType: academicData.interType ?? prev.interType,
          interPercentage: academicData.interPercentage ?? prev.interPercentage,
          semesterRecords: academicData.semesterRecords ?? prev.semesterRecords
        };
      });
      return { success: true };
    }
    return { success: false, error: res.error || 'Failed to update academic details' };
  };

  // Student submits or updates a semester record
  const submitSemesterCgpa = async ({ semesterNumber, cumulativeCgpa }) => {
    const res = await api.submitSemesterRecord({ semesterNumber, cumulativeCgpa });
    if (res.success) {
      const recordsRes = await api.fetchStudentRecords();
      if (recordsRes.success && Array.isArray(recordsRes.records)) {
        const updatedRecords = recordsRes.records.map((r) => ({
          term: `Semester ${r.semester_number}`,
          semesterNumber: r.semester_number,
          cgpa: r.cumulative_cgpa,
          status: 'Updated',
          submittedAt: r.submitted_at
        }));
        setActiveStudent((prev) => (prev ? { ...prev, semesterRecords: updatedRecords } : prev));
      }
      return { success: true };
    }
    return { success: false, error: res.error || 'Failed to submit semester CGPA' };
  };

  // Create Campaign / Update Request
  const createYearSpecificUpdateRequest = async ({ title, targetYear, targetSemester, instructions, deadline }) => {
    // Convert 'Year 2' -> 2, 'Semester 3' -> 3
    const parsedYear = parseInt(String(targetYear).replace(/\D/g, ''), 10) || 2;
    const parsedSem = parseInt(String(targetSemester).replace(/\D/g, ''), 10) || 1;
    const targetTerm = (parsedSem % 2 === 0) ? 2 : 1;

    const res = await api.createCampaign({
      title: title.trim(),
      target_year: parsedYear,
      target_term: targetTerm,
      target_semester: parsedSem,
      instructions: instructions ? instructions.trim() : 'Please update your official semester grades.',
      deadline: deadline || new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0]
    });

    if (res.success) {
      await refreshHodData();
      return res.campaign;
    }
    throw new Error(res.error || 'Failed to create campaign');
  };

  const isStudentSubmittedForRequest = (student, request) => {
    if (!student || !request) return false;
    if (student.year !== request.targetYear) return false;

    const record = (student.semesterRecords || []).find((r) => r.term === request.targetSemester);
    return Boolean(record && record.cgpa !== null && record.status === 'Updated');
  };

  const logout = () => {
    api.clearAuthToken();
    setCurrentRole(null);
    setActiveStudent(null);
    localStorage.removeItem(STORAGE_KEYS.AUTH_ROLE);
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_STUDENT_ID);
  };

  return (
    <AuthContext.Provider
      value={{
        loading,
        currentRole,
        isAdminAuthenticated: currentRole === 'admin',
        isStudentAuthenticated: currentRole === 'student',
        hodUser,
        activeStudent,
        students,
        updateRequests,
        analytics,
        loginAsAdmin,
        loginAsHod: loginAsAdmin,
        loginAsStudent,
        logout,
        createStudentAccount,
        changeStudentPassword,
        completeStudentOnboarding,
        updateStudentProfile,
        uploadStudentPhoto,
        updateStudentAcademicDetails,
        submitSemesterCgpa,
        createYearSpecificUpdateRequest,
        isStudentSubmittedForRequest,
        refreshHodData
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;

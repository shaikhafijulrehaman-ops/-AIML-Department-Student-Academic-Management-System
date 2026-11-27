import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Home,
  GraduationCap,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  CheckCircle2,
  Clock,
  Camera,
  Edit3,
  Award,
  BookOpen,
  LogOut,
  AlertCircle,
  X,
  ArrowRight,
  Save,
  Layers,
  Upload,
  RotateCcw,
  Sparkles,
  Info,
  Loader2
} from 'lucide-react';
import BRANDING from '../../config/branding';
import CollegeLogo from '../../components/CollegeLogo';
import { useAuth } from '../../context/AuthContext';
import { getMaxCompletedSemForTerm, getStudentLatestAcademics, ALL_SEMESTER_TERMS, getTermsForYear, YEAR_ALLOWED_TERMS } from '../../data/mockData';
import { getBatchLabel, getAcademicYearDisplay } from '../../utils/academicYearMapping';
import { useTheme } from '../../context/ThemeContext';
import { THEMES } from '../../config/theme';
import StudentChangePasswordView from '../../components/StudentChangePasswordView';
import StudentCompleteProfileView from '../../components/StudentCompleteProfileView';

export default function StudentDashboardPage() {
  const navigate = useNavigate();
  const { setTheme } = useTheme();

  useEffect(() => {
    setTheme(THEMES.STUDENT);
  }, [setTheme]);
  const {
    activeStudent,
    logout,
    updateStudentProfile,
    uploadStudentPhoto,
    updateStudentAcademicDetails,
    updateRequests,
    isStudentSubmittedForRequest,
    changeStudentPassword,
    completeStudentOnboarding
  } = useAuth();

  // Student Navigation strictly limited to the 4 required sections:
  // 1. My Dashboard | 2. My Portfolio | 3. Academic Details | 4. Update Requests
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'profile' | 'academics' | 'requests'

  // Structured toast feedback: { text: string, type: 'success' | 'error' } | null
  const [toastMessage, setToastMessage] = useState(null);
  const [isPhotoUploading, setIsPhotoUploading] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingAcademic, setIsSavingAcademic] = useState(false);

  // ==========================================
  // SECTION 2: STUDENT PROFILE FORM STATE
  // Explicit Save / Cancel behaviour: No automatic saving!
  // ==========================================
  const [profileForm, setProfileForm] = useState({
    name: activeStudent?.name || '',
    registerNumber: activeStudent?.registerNumber || '',
    email: activeStudent?.email || '',
    phone: activeStudent?.phone || '',
    location: activeStudent?.location || '',
    year: activeStudent?.year || '',
    term: activeStudent?.term || '',
    profilePhoto: activeStudent?.profilePhoto || null,
    hasBacklogs: activeStudent?.hasBacklogs ?? null,
    backlogCount: activeStudent?.backlogCount !== null && activeStudent?.backlogCount !== undefined ? String(activeStudent.backlogCount) : '',
  });

  const [photoPreview, setPhotoPreview] = useState(activeStudent?.profilePhoto || null);
  const [isProfileDirty, setIsProfileDirty] = useState(false);

  // Reset form whenever active student changes
  useEffect(() => {
    setProfileForm({
      name: activeStudent?.name || '',
      registerNumber: activeStudent?.registerNumber || '',
      email: activeStudent?.email || '',
      phone: activeStudent?.phone || '',
      location: activeStudent?.location || '',
      year: activeStudent?.year || '',
      term: activeStudent?.term || '',
      profilePhoto: activeStudent?.profilePhoto || '',
      hasBacklogs: activeStudent?.hasBacklogs ?? null,
      backlogCount: activeStudent?.backlogCount !== null && activeStudent?.backlogCount !== undefined ? String(activeStudent.backlogCount) : '',
    });
    setPhotoPreview(activeStudent?.profilePhoto || null);
    setIsProfileDirty(false);
  }, [activeStudent]);

  const handleProfileFieldChange = (field, value) => {
    setProfileForm((prev) => ({ ...prev, [field]: value }));
    setIsProfileDirty(true);
  };

  const handlePhotoSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate mime type: JPEG and PNG strictly required
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      setToastMessage({
        text: 'Invalid file format. Only JPEG and PNG images are supported by storage.',
        type: 'error'
      });
      return;
    }

    // Validate size: 1 MB maximum
    if (file.size > 1048576) {
      setToastMessage({
        text: 'File size exceeds 1 MB limit. Please select an image under 1 MB.',
        type: 'error'
      });
      return;
    }

    // Immediate local preview
    const localUrl = URL.createObjectURL(file);
    setPhotoPreview(localUrl);
    setIsPhotoUploading(true);

    try {
      const res = await uploadStudentPhoto(file);
      if (res?.success && res.signedUrl) {
        setPhotoPreview(res.signedUrl);
        setToastMessage({
          text: 'Profile photo uploaded and saved successfully to secure storage!',
          type: 'success'
        });
        setTimeout(() => setToastMessage(null), 4000);
      } else {
        setPhotoPreview(activeStudent?.profilePhoto || null);
        setToastMessage({
          text: res?.error || 'Failed to upload photo to secure storage.',
          type: 'error'
        });
      }
    } catch (err) {
      setPhotoPreview(activeStudent?.profilePhoto || null);
      setToastMessage({
        text: err?.message || 'Error occurred during photo upload.',
        type: 'error'
      });
    } finally {
      setIsPhotoUploading(false);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!profileForm.name?.trim()) {
      setToastMessage({ text: 'Full Name is required.', type: 'error' });
      return;
    }
    if (!profileForm.email?.trim() || !profileForm.email.includes('@')) {
      setToastMessage({ text: 'A valid email address is required.', type: 'error' });
      return;
    }
    if (!profileForm.phone?.trim()) {
      setToastMessage({ text: 'Contact Phone Number is required.', type: 'error' });
      return;
    }
    if (!profileForm.location?.trim() || profileForm.location.trim().toLowerCase() === 'other') {
      setToastMessage({ text: 'A valid residential location is required.', type: 'error' });
      return;
    }

    if (profileForm.hasBacklogs === true) {
      const c = parseInt(profileForm.backlogCount, 10);
      if (isNaN(c) || c < 1 || String(profileForm.backlogCount).includes('.')) {
        setToastMessage({ text: 'Number of backlogs must be a positive whole number (at least 1).', type: 'error' });
        return;
      }
    }

    if (activeStudent?.id) {
      setIsSavingProfile(true);
      try {
        const payload = {
          fullName: profileForm.name.trim(),
          name: profileForm.name.trim(),
          email: profileForm.email.trim(),
          phoneNumber: profileForm.phone.trim(),
          phone: profileForm.phone.trim(),
          location: profileForm.location.trim()
        };

        if (profileForm.hasBacklogs !== null && profileForm.hasBacklogs !== undefined) {
          payload.hasBacklogs = Boolean(profileForm.hasBacklogs);
          payload.backlogCount = profileForm.hasBacklogs ? parseInt(profileForm.backlogCount, 10) : 0;
        }

        const res = await updateStudentProfile(activeStudent.id, payload);

        if (res?.success) {
          setIsProfileDirty(false);
          setToastMessage({
            text: 'Profile changes saved and verified in database!',
            type: 'success'
          });
          setTimeout(() => setToastMessage(null), 3500);
        } else {
          setToastMessage({
            text: res?.error || 'Failed to update student profile.',
            type: 'error'
          });
          // Form values preserved so user can retry
        }
      } catch (err) {
        setToastMessage({
          text: err?.message || 'Network error updating profile. Please retry.',
          type: 'error'
        });
      } finally {
        setIsSavingProfile(false);
      }
    }
  };

  const handleCancelProfile = () => {
    setProfileForm({
      name: activeStudent?.name || '',
      registerNumber: activeStudent?.registerNumber || '',
      email: activeStudent?.email || '',
      phone: activeStudent?.phone || '',
      location: activeStudent?.location || '',
      year: activeStudent?.year || '',
      term: activeStudent?.term || '',
      profilePhoto: activeStudent?.profilePhoto || null,
    });
    setPhotoPreview(activeStudent?.profilePhoto || null);
    setIsProfileDirty(false);
  };

  // ==========================================
  // SECTION 3: ACADEMIC DETAILS FORM STATE
  // Explicit Save / Cancel behaviour: No automatic saving!
  // ==========================================
  const [academicForm, setAcademicForm] = useState({
    sscPercentage: activeStudent?.sscPercentage || '',
    interType: activeStudent?.interType || 'intermediate',
    interPercentage: activeStudent?.interPercentage || '',
    semesterRecords: JSON.parse(JSON.stringify(activeStudent?.semesterRecords || [])),
  });

  const [isAcademicDirty, setIsAcademicDirty] = useState(false);

  useEffect(() => {
    setAcademicForm({
      sscPercentage: activeStudent?.sscPercentage || '',
      interType: activeStudent?.interType || 'intermediate',
      interPercentage: activeStudent?.interPercentage || '',
      semesterRecords: JSON.parse(JSON.stringify(activeStudent?.semesterRecords || [])),
    });
    setIsAcademicDirty(false);
  }, [activeStudent]);

  // Max completed semester number based on current term
  const maxCompletedSem = getMaxCompletedSemForTerm(activeStudent?.term || '');

  const handleSemesterInputChange = (semNumber, field, value) => {
    setAcademicForm((prev) => {
      const updated = prev.semesterRecords.map((r) => {
        if (r.semNumber === semNumber) {
          const numVal = value === '' ? null : parseFloat(value);
          const next = { ...r, [field]: numVal };
          if (next.cgpa !== null) {
            next.status = 'Updated';
          } else {
            next.status = 'Pending Entry';
          }
          return next;
        }
        return r;
      });
      return { ...prev, semesterRecords: updated };
    });
    setIsAcademicDirty(true);
  };

  const handleSaveAcademicDetails = async (e) => {
    e.preventDefault();
    if (activeStudent?.id) {
      setIsSavingAcademic(true);
      const res = await updateStudentAcademicDetails(activeStudent.id, academicForm);
      setIsSavingAcademic(false);

      if (res?.success) {
        setIsAcademicDirty(false);
        setToastMessage({
          text: 'Academic details saved and verified in database!',
          type: 'success'
        });
        setTimeout(() => setToastMessage(null), 3500);
      } else {
        setToastMessage({
          text: res?.error || 'Failed to save academic details.',
          type: 'error'
        });
      }
    }
  };

  const handleCancelAcademicDetails = () => {
    setAcademicForm({
      sscPercentage: activeStudent?.sscPercentage || '',
      interType: activeStudent?.interType || 'intermediate',
      interPercentage: activeStudent?.interPercentage || '',
      semesterRecords: JSON.parse(JSON.stringify(activeStudent?.semesterRecords || [])),
    });
    setIsAcademicDirty(false);
  };

  // ==========================================
  // SECTION 5: YEAR-SPECIFIC REQUESTS FILTERING
  // Requests appear ONLY for the selected eligible year!
  // ==========================================
  const targetedRequests = useMemo(() => {
    if (!activeStudent?.year) return [];
    return updateRequests.filter((r) => r.targetYear === activeStudent.year);
  }, [updateRequests, activeStudent?.year]);

  // Count only genuinely PENDING requests for the currently logged-in student
  const pendingRequestsCount = useMemo(() => {
    if (!activeStudent) return 0;
    return targetedRequests.filter((r) => !isStudentSubmittedForRequest(activeStudent, r)).length;
  }, [targetedRequests, activeStudent, isStudentSubmittedForRequest]);

  const latestAcademics = useMemo(() => {
    return activeStudent ? getStudentLatestAcademics(activeStudent) : {};
  }, [activeStudent]);

  const handleLogout = () => {
    logout();
    navigate('/student/login');
  };

  // Loading state when activeStudent is resolving
  if (!activeStudent) {
    return (
      <div className="min-h-screen bg-[#E8E0CF] flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[#3D0C1A] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold text-[#3D0C1A]">Loading student workspace...</p>
        </div>
      </div>
    );
  }

  // ==========================================
  // ONBOARDING WORKFLOW GUARDS
  // 1. Mandatory First-Login Password Change
  // 2. Mandatory Student Profile Completion
  // ==========================================
  if (activeStudent?.mustChangePassword) {
    return (
      <StudentChangePasswordView
        student={activeStudent}
        onPasswordChanged={async (newPassword) => {
          const res = await changeStudentPassword(activeStudent.id, newPassword);
          if (res?.success) {
            setToastMessage('Password updated successfully! Please now complete your student profile.');
            setTimeout(() => setToastMessage(null), 4000);
          }
          return res;
        }}
        onLogout={handleLogout}
      />
    );
  }

  if (activeStudent?.onboardingStatus === 'Profile Pending') {
    return (
      <StudentCompleteProfileView
        student={activeStudent}
        onCompleteProfile={async (profileData) => {
          const res = await completeStudentOnboarding(activeStudent.id, profileData);
          if (res?.success) {
            setToastMessage('Welcome! Your profile has been completed and saved successfully.');
            setTimeout(() => setToastMessage(null), 5000);
          }
          return res;
        }}
        onLogout={handleLogout}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#E8E0CF] text-[#1F2926] flex flex-col font-sans antialiased pb-12 md:pb-0 w-full max-w-full overflow-x-hidden">
      {/* ============================================================== */}
      {/* MOBILE FLOATING GLASSMORPHISM PILL NAVIGATION (md:hidden)      */}
      {/* ============================================================== */}
      <header
        aria-label="Student Mobile Navigation"
        className="fixed top-3 inset-x-3 z-50 md:hidden bg-white/90 backdrop-blur-xl border border-white/60 shadow-lg rounded-full px-3 py-1.5 flex items-center justify-between max-w-[calc(100vw-24px)] mx-auto"
      >
        {/* Left: Student Identity Badge */}
        <div className="flex items-center gap-1.5 pl-1">
          <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-[#5E8881] text-white shadow-xs">
            STUDENT
          </span>
        </div>

        {/* Center: 4 Floating Navigation Icons */}
        <nav className="flex items-center gap-1 sm:gap-2">
          {/* 1. My Dashboard */}
          <button
            type="button"
            onClick={() => setActiveTab('dashboard')}
            aria-label="My Dashboard"
            title="My Dashboard"
            className={`p-2 rounded-full transition-all cursor-pointer flex items-center justify-center ${
              activeTab === 'dashboard'
                ? 'bg-[#5E8881] text-white shadow-sm ring-1 ring-[#E8213A]'
                : 'text-slate-600 hover:text-slate-900 active:scale-95'
            }`}
          >
            <Home className="w-4 h-4" />
          </button>

          {/* 2. My Portfolio */}
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            aria-label="My Portfolio"
            title="My Portfolio"
            className={`p-2 rounded-full transition-all cursor-pointer flex items-center justify-center relative ${
              activeTab === 'profile'
                ? 'bg-[#5E8881] text-white shadow-sm ring-1 ring-[#E8213A]'
                : 'text-slate-600 hover:text-slate-900 active:scale-95'
            }`}
          >
            <User className="w-4 h-4" />
            {isProfileDirty && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#E8213A] ring-1 ring-white"></span>
            )}
          </button>

          {/* 3. Academic Details */}
          <button
            type="button"
            onClick={() => setActiveTab('academics')}
            aria-label="Academic Details"
            title="Academic Details"
            className={`p-2 rounded-full transition-all cursor-pointer flex items-center justify-center relative ${
              activeTab === 'academics'
                ? 'bg-[#5E8881] text-white shadow-sm ring-1 ring-[#E8213A]'
                : 'text-slate-600 hover:text-slate-900 active:scale-95'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            {isAcademicDirty && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#E8213A] ring-1 ring-white"></span>
            )}
          </button>

          {/* 4. Update Requests */}
          <button
            type="button"
            onClick={() => setActiveTab('requests')}
            aria-label="Update Requests"
            title="Update Requests"
            className={`p-2 rounded-full transition-all cursor-pointer flex items-center justify-center relative ${
              activeTab === 'requests'
                ? 'bg-[#5E8881] text-white shadow-sm ring-1 ring-[#E8213A]'
                : 'text-slate-600 hover:text-slate-900 active:scale-95'
            }`}
          >
            <Clock className="w-4 h-4" />
            {pendingRequestsCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#E8213A] ring-1 ring-white"></span>
            )}
          </button>
        </nav>

        {/* Right: Logout Icon */}
        <button
          type="button"
          onClick={handleLogout}
          aria-label="Logout"
          title="Logout"
          className="p-1.5 rounded-full text-slate-500 hover:text-rose-600 active:scale-95 transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4 text-[#E8213A]" />
        </button>
      </header>

      {/* Mobile Branding Bar (Below floating navigation, md:hidden) */}
      <div className="md:hidden px-3 pt-16 pb-2 w-full max-w-full min-w-0">
        <div className="flex items-center gap-2.5 p-2 rounded-2xl bg-white/70 backdrop-blur-xs border border-[#D4CAB4]/70 shadow-2xs">
          <CollegeLogo size="sm" badge />
          <div className="leading-tight flex-1 min-w-0">
            <h1 className="text-xs font-bold text-slate-900 truncate">
              {BRANDING.collegeName}
            </h1>
            <p className="text-[10px] font-semibold text-[#5E8881] truncate">
              {BRANDING.departmentName} &bull; Student Portal
            </p>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* DESKTOP TOP BAR & HORIZONTAL NAVIGATION (hidden md:block)       */}
      {/* ============================================================== */}
      <header className="hidden md:block bg-[#5E8881] text-white shadow-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <CollegeLogo size="sm" badge />
            <div className="leading-tight">
              <h1 className="text-xs sm:text-sm font-bold tracking-tight text-white">
                {BRANDING.collegeName}
              </h1>
              <p className="text-[11px] font-semibold text-[#F5F1E8]">
                {BRANDING.departmentName} &bull; Student Portal
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            <div className="hidden sm:flex flex-col text-right leading-tight">
              <span className="text-xs font-bold text-white">{activeStudent.name}</span>
              <span className="text-[10px] text-white/80 font-mono">{activeStudent.registerNumber}</span>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 active:scale-95 text-xs font-bold text-white border border-white/20 transition-all cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5 text-[#E8213A]" />
              <span>Logout</span>
            </button>
          </div>
        </div>

        {/* Student Navigation Bar strictly with 4 tabs */}
        <div className="bg-[#48706A] border-t border-white/10 px-4 sm:px-8">
          <div className="max-w-6xl mx-auto flex items-center gap-1 sm:gap-3 overflow-x-auto">
            {/* 1. My Dashboard */}
            <button
              type="button"
              onClick={() => setActiveTab('dashboard')}
              className={`py-2.5 px-3 sm:px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'border-[#E8213A] text-white'
                  : 'border-transparent text-white/75 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-white" />
              <span>1. My Dashboard</span>
            </button>

            {/* 2. My Portfolio (renamed from My Profile) */}
            <button
              type="button"
              onClick={() => setActiveTab('profile')}
              className={`py-2.5 px-3 sm:px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'profile'
                  ? 'border-[#E8213A] text-white'
                  : 'border-transparent text-white/75 hover:text-white'
              }`}
            >
              <User className="w-3.5 h-3.5 text-white" />
              <span>2. My Portfolio</span>
              {isProfileDirty && (
                <span className="w-2 h-2 rounded-full bg-[#E8213A]"></span>
              )}
            </button>

            {/* 3. Academic Details */}
            <button
              type="button"
              onClick={() => setActiveTab('academics')}
              className={`py-2.5 px-3 sm:px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'academics'
                  ? 'border-[#E8213A] text-white'
                  : 'border-transparent text-white/75 hover:text-white'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 text-white" />
              <span>3. Academic Details</span>
              {isAcademicDirty && (
                <span className="w-2 h-2 rounded-full bg-[#E8213A]"></span>
              )}
            </button>

            {/* 4. Update Requests */}
            <button
              type="button"
              onClick={() => setActiveTab('requests')}
              className={`py-2.5 px-3 sm:px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'requests'
                  ? 'border-[#E8213A] text-white'
                  : 'border-transparent text-white/75 hover:text-white'
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-white" />
              <span>4. Update Requests</span>
              {pendingRequestsCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-[#E8213A] text-white font-bold">
                  {pendingRequestsCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 w-full flex-1 space-y-4 sm:space-y-6 min-w-0 overflow-x-hidden">
        {/* Toast Feedback with Strict Error / Success Alert Styling */}
        {toastMessage && (
          <div className={`p-3.5 rounded-2xl border text-xs font-semibold flex items-center justify-between shadow-sm animate-in fade-in ${
            (typeof toastMessage === 'object' && toastMessage.type === 'error')
              ? 'bg-rose-50 border-rose-300 text-rose-800'
              : 'bg-emerald-50 border-emerald-300 text-emerald-800'
          }`}>
            <div className="flex items-center gap-2">
              {(typeof toastMessage === 'object' && toastMessage.type === 'error') ? (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              )}
              <span>{typeof toastMessage === 'object' ? toastMessage.text : toastMessage}</span>
            </div>
            <button
              onClick={() => setToastMessage(null)}
              className={
                (typeof toastMessage === 'object' && toastMessage.type === 'error')
                  ? 'text-rose-700 hover:text-rose-900 cursor-pointer'
                  : 'text-emerald-700 hover:text-emerald-900 cursor-pointer'
              }
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 1: MY DASHBOARD                                            */}
        {/* ============================================================== */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Welcome Banner */}
            <div className="bg-white rounded-3xl p-5 sm:p-8 border border-[#D4CAB4] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-5 sm:gap-6 overflow-hidden">
              <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl overflow-hidden bg-slate-100 border-2 border-[#7FA8A1] shadow-sm flex items-center justify-center text-slate-400 font-bold text-base sm:text-lg shrink-0">
                  {activeStudent.profilePhoto ? (
                    <img src={activeStudent.profilePhoto} alt={activeStudent.name} className="w-full h-full object-cover" />
                  ) : (
                    <span>{activeStudent.name ? activeStudent.name.substring(0, 2).toUpperCase() : 'ST'}</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                    <h2 className="text-base sm:text-xl font-bold text-slate-900 truncate max-w-full">
                      Welcome, {activeStudent.name}
                    </h2>
                    <span className="px-2 py-0.5 rounded-md bg-[#7FA8A1]/20 text-[#3D6660] text-[11px] sm:text-xs font-mono font-bold shrink-0">
                      {activeStudent.registerNumber}
                    </span>
                  </div>
                  <p className="text-[11px] sm:text-xs text-slate-600 mt-1 font-medium truncate">
                    {activeStudent.batch || getBatchLabel(activeStudent.currentYear)} &bull; Term {activeStudent.currentTerm || 1} &bull; {BRANDING.departmentAbbr}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setActiveTab('profile')}
                  className="px-3.5 sm:px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-xs font-bold text-slate-700 transition-colors cursor-pointer"
                >
                  Edit Profile
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('academics')}
                  className="px-3.5 sm:px-4 py-2 rounded-xl bg-[#5E8881] hover:bg-[#4A6F68] text-white text-xs font-bold shadow-sm transition-colors cursor-pointer"
                >
                  Academic Details
                </button>
              </div>
            </div>

            {/* Academic Highlights Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 text-xs">
              <div className="bg-white rounded-2xl p-4 border border-[#D4CAB4] shadow-sm">
                <span className="text-slate-500 font-bold block">Current Term</span>
                <div className="text-2xl font-extrabold text-slate-900 mt-1">
                  {activeStudent.term}
                </div>
                <span className="text-[10px] text-slate-400">{activeStudent.year} Cohort</span>
              </div>

              <div className="bg-white rounded-2xl p-4 border border-[#D4CAB4] shadow-sm">
                <span className="text-slate-500 font-bold block">Latest Completed</span>
                <div className="text-2xl font-extrabold text-[#5E8881] mt-1">
                  Sem {latestAcademics.latestSemester}
                </div>
                <span className="text-[10px] text-slate-400">Recorded semester</span>
              </div>

              <div className="bg-white rounded-2xl p-4 border border-[#D4CAB4] shadow-sm">
                <span className="text-slate-500 font-bold block">Prior Education</span>
                <div className="text-base font-extrabold text-slate-900 mt-1">
                  <span>{activeStudent.sscPercentage}%</span>
                  <span className="text-slate-400 font-normal"> / </span>
                  <span className="text-[#5E8881]">{activeStudent.interPercentage}%</span>
                </div>
                <span className="text-[10px] text-slate-400">SSC / {activeStudent.interType}</span>
              </div>

              <div className="bg-white rounded-2xl p-4 border border-[#D4CAB4] shadow-sm">
                <span className="text-slate-500 font-bold block">Latest CGPA</span>
                <div className="text-2xl font-extrabold text-emerald-700 mt-1">
                  {latestAcademics.latestCgpa !== null ? latestAcademics.latestCgpa.toFixed(2) : '—'}
                </div>
                <span className="text-[10px] text-slate-400">Cumulative score</span>
              </div>

              <div className="bg-white rounded-2xl p-4 border border-[#D4CAB4] shadow-sm">
                <span className="text-slate-500 font-bold block">Backlogs</span>
                <div className="text-base font-extrabold mt-1">
                  {activeStudent.hasBacklogs === false ? (
                    <span className="text-emerald-700 font-bold">No Backlogs</span>
                  ) : activeStudent.hasBacklogs === true ? (
                    <span className="text-rose-700 font-bold">{activeStudent.backlogCount || 1} Active</span>
                  ) : (
                    <span className="text-slate-500 font-medium">Not Provided</span>
                  )}
                </div>
                <span className="text-[10px] text-slate-400">Academic Standing</span>
              </div>
            </div>

            {/* Targeted Update Requests Alert Banner */}
            {targetedRequests.map((req) => {
              const isSubmitted = isStudentSubmittedForRequest(activeStudent, req);
              return (
                <div
                  key={req.id}
                  className={`p-5 rounded-3xl border shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    isSubmitted
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                      : 'bg-white border-[#E8213A]/50 text-slate-900'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      isSubmitted ? 'bg-emerald-600 text-white' : 'bg-[#E8213A] text-white shadow-md shadow-[#E8213A]/20'
                    }`}>
                      {isSubmitted ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm">{req.title}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isSubmitted ? 'bg-emerald-200 text-emerald-900' : 'bg-[#E8213A]/15 text-[#E8213A]'
                        }`}>
                          {isSubmitted ? 'Submitted' : 'Pending Response'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1">
                        {req.instructions} (Target: {req.targetYear} &bull; Semester {req.targetSemester})
                      </p>
                    </div>
                  </div>

                  {!isSubmitted && (
                    <button
                      type="button"
                      onClick={() => setActiveTab('academics')}
                      className="px-4 py-2 rounded-xl bg-[#E8213A] hover:bg-[#C7152D] text-white font-bold text-xs shadow-md transition-all self-start sm:self-auto cursor-pointer flex items-center gap-1.5"
                    >
                      <span>Update {req.targetSemester} Marks</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 2: MY PROFILE (FULL EDITING WITH SAVE / CANCEL)            */}
        {/* ============================================================== */}
        {activeTab === 'profile' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#D4CAB4] shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  Student Portfolio &amp; Profile Details
                </h3>
                <p className="text-xs text-slate-500">
                  Full editing enabled. Changes are only applied when you click explicit "Save Changes".
                </p>
              </div>

              {isProfileDirty && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold animate-pulse">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Unsaved changes present
                </span>
              )}
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-6">
              {/* Profile Photo Picker & Preview */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Profile Photo (Upload &amp; Permanent Storage)
                </label>
                <div className="flex flex-col sm:flex-row sm:items-center gap-5">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden bg-slate-100 border-2 border-[#7FA8A1] shadow-sm flex items-center justify-center text-slate-400 font-bold shrink-0 relative">
                    {photoPreview ? (
                      <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-10 h-10 text-[#5E8881]" />
                    )}
                    {isPhotoUploading && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <Loader2 className="w-6 h-6 text-white animate-spin" />
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label
                      htmlFor="profile-photo-input"
                      className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#5E8881] hover:bg-[#4A6F68] text-white text-xs font-bold shadow-sm transition-colors ${
                        isPhotoUploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                      }`}
                    >
                      {isPhotoUploading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Uploading Image...</span>
                        </>
                      ) : (
                        <>
                          <Camera className="w-4 h-4" />
                          <span>{photoPreview ? 'Change Photo' : 'Select Photo'}</span>
                        </>
                      )}
                      <input
                        id="profile-photo-input"
                        type="file"
                        accept="image/jpeg,image/png"
                        disabled={isPhotoUploading}
                        onChange={handlePhotoSelect}
                        className="hidden"
                      />
                    </label>
                    <p className="text-[11px] text-slate-500">
                      Supports PNG and JPEG (Max 1MB). Uploads permanently to private bucket <code className="text-[10px] bg-slate-100 px-1 py-0.5 rounded text-slate-700">aiml-student-photos</code>.
                    </p>
                  </div>
                </div>
              </div>

              {/* Editable Fields Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* Full Name */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1" htmlFor="prof-name">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="prof-name"
                    type="text"
                    required
                    value={profileForm.name}
                    onChange={(e) => handleProfileFieldChange('name', e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 outline-none focus:ring-1 focus:ring-[#5E8881] text-sm font-semibold"
                  />
                </div>

                {/* Register Number (Institutional ID - Read-only) */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1" htmlFor="prof-regno">
                    Register Number (Institutional ID)
                  </label>
                  <input
                    id="prof-regno"
                    type="text"
                    readOnly
                    disabled
                    value={profileForm.registerNumber}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-100 text-slate-600 font-mono font-bold cursor-not-allowed text-sm"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1" htmlFor="prof-email">
                    Official Student Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="prof-email"
                    type="email"
                    required
                    value={profileForm.email}
                    onChange={(e) => handleProfileFieldChange('email', e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 outline-none focus:ring-1 focus:ring-[#5E8881]"
                  />
                </div>

                {/* Contact Number */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1" htmlFor="prof-phone">
                    Contact Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="prof-phone"
                    type="tel"
                    required
                    value={profileForm.phone}
                    onChange={(e) => handleProfileFieldChange('phone', e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 outline-none focus:ring-1 focus:ring-[#5E8881]"
                  />
                </div>

                {/* Location */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1" htmlFor="prof-loc">
                    Current Location / Town <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="prof-loc"
                    type="text"
                    required
                    value={profileForm.location}
                    onChange={(e) => handleProfileFieldChange('location', e.target.value)}
                    placeholder="e.g. Bhimavaram, Vijayawada, Guntur..."
                    className="w-full p-2.5 rounded-xl border border-slate-300 outline-none focus:ring-1 focus:ring-[#5E8881]"
                  />
                </div>

                {/* Backlog Status */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 sm:col-span-2 space-y-2.5">
                  <label className="block font-bold text-slate-800 text-xs">
                    Do you have any backlogs? <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center gap-6">
                    <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-slate-700">
                      <input
                        type="radio"
                        name="prof-has-backlogs"
                        checked={profileForm.hasBacklogs === true}
                        onChange={() => {
                          handleProfileFieldChange('hasBacklogs', true);
                          if (!profileForm.backlogCount || profileForm.backlogCount === '0') {
                            handleProfileFieldChange('backlogCount', '1');
                          }
                        }}
                        className="w-4 h-4 text-[#5E8881] focus:ring-[#5E8881]"
                      />
                      <span>Yes</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-slate-700">
                      <input
                        type="radio"
                        name="prof-has-backlogs"
                        checked={profileForm.hasBacklogs === false}
                        onChange={() => {
                          handleProfileFieldChange('hasBacklogs', false);
                          handleProfileFieldChange('backlogCount', '0');
                        }}
                        className="w-4 h-4 text-[#5E8881] focus:ring-[#5E8881]"
                      />
                      <span>No</span>
                    </label>
                  </div>

                  {profileForm.hasBacklogs === true && (
                    <div className="pt-1 max-w-xs">
                      <label htmlFor="prof-backlog-count" className="block font-bold text-slate-700 mb-1 text-xs">
                        Number of Backlogs <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="prof-backlog-count"
                        type="number"
                        min="1"
                        step="1"
                        value={profileForm.backlogCount}
                        onChange={(e) => handleProfileFieldChange('backlogCount', e.target.value)}
                        placeholder="e.g. 1, 2, 3..."
                        className="w-full p-2.5 rounded-xl border border-slate-300 bg-white font-bold text-slate-900 outline-none focus:ring-1 focus:ring-[#5E8881]"
                      />
                    </div>
                  )}
                </div>

                {/* Academic Year (Institutional Standing - Locked after onboarding) */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Current Academic Year &amp; Batch
                  </label>
                  <div className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-semibold text-slate-700 flex items-center justify-between">
                    <span>{activeStudent.year} ({activeStudent.batch || getBatchLabel(activeStudent.currentYear)})</span>
                    <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-mono font-bold">LOCKED</span>
                  </div>
                </div>

                {/* Current Term (Locked after onboarding) */}
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">
                    Current Semester / Term
                  </label>
                  <div className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-semibold text-slate-700 flex items-center justify-between">
                    <span>Term {activeStudent.currentTerm || 1} ({activeStudent.term})</span>
                    <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-mono font-bold">LOCKED</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Academic cohort and term were recorded during onboarding. To request a standing update, contact the AIML HOD Office.
                  </p>
                </div>
              </div>

              {/* Explicit Action Buttons: Save Changes & Cancel */}
              <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={handleCancelProfile}
                  disabled={isSavingProfile || isPhotoUploading}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50 disabled:opacity-50 transition-colors cursor-pointer text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingProfile || isPhotoUploading}
                  className="px-6 py-2.5 rounded-xl bg-[#5E8881] hover:bg-[#4A6F68] disabled:opacity-50 text-white font-bold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {isSavingProfile ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 3: ACADEMIC DETAILS (CGPA FOR ELIGIBLE COMPLETED TERMS) */}
        {/* ============================================================== */}
        {activeTab === 'academics' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#D4CAB4] shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  Student Academic Details &amp; Semester Records
                </h3>
                <p className="text-xs text-slate-500">
                  Students may update completed semesters at any time. Changes persist upon clicking "Save Academic Details".
                </p>
              </div>

              {isAcademicDirty && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold animate-pulse">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Unsaved academic updates
                </span>
              )}
            </div>

            <form onSubmit={handleSaveAcademicDetails} className="space-y-6 text-xs">
              {/* SSC & Intermediate / Diploma Section */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* SSC % */}
                <div>
                  <label className="block font-bold text-slate-800 mb-1" htmlFor="acad-ssc">
                    SSC Percentage (%)
                  </label>
                  <input
                    id="acad-ssc"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    required
                    value={academicForm.sscPercentage}
                    onChange={(e) => {
                      setAcademicForm((prev) => ({ ...prev, sscPercentage: e.target.value }));
                      setIsAcademicDirty(true);
                    }}
                    className="w-full p-2 rounded-xl border border-slate-300 bg-white font-bold"
                  />
                </div>

                {/* Education Type: Intermediate or Diploma */}
                <div>
                  <label className="block font-bold text-slate-800 mb-1" htmlFor="acad-inter-type">
                    Pre-University Education Type
                  </label>
                  <select
                    id="acad-inter-type"
                    value={academicForm.interType}
                    onChange={(e) => {
                      setAcademicForm((prev) => ({ ...prev, interType: e.target.value }));
                      setIsAcademicDirty(true);
                    }}
                    className="w-full p-2 rounded-xl border border-slate-300 bg-white font-bold"
                  >
                    <option value="Intermediate">Intermediate (10+2)</option>
                    <option value="Diploma">Diploma (Polytechnic)</option>
                  </select>
                </div>

                {/* Percentage */}
                <div>
                  <label className="block font-bold text-slate-800 mb-1" htmlFor="acad-inter-pct">
                    {academicForm.interType} Percentage (%)
                  </label>
                  <input
                    id="acad-inter-pct"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    required
                    value={academicForm.interPercentage}
                    onChange={(e) => {
                      setAcademicForm((prev) => ({ ...prev, interPercentage: e.target.value }));
                      setIsAcademicDirty(true);
                    }}
                    className="w-full p-2 rounded-xl border border-slate-300 bg-white font-bold"
                  />
                </div>
              </div>

              {/* Exact Eligibility Notice */}
              <div className="p-3.5 rounded-2xl bg-[#E8E0CF]/60 border border-[#D4CAB4] flex items-start gap-2.5">
                <Info className="w-4 h-4 text-[#5E8881] flex-shrink-0 mt-0.5" />
                <div className="text-slate-700 space-y-0.5">
                  <p className="font-semibold text-slate-900">
                    Semester Eligibility Rules ({activeStudent.term} Student):
                  </p>
                  <p className="text-[11px] text-slate-600">
                    As a {activeStudent.term} student, you are eligible to enter and update completed semesters up to Semester {maxCompletedSem}. You are not asked to enter ongoing or future semester marks.
                  </p>
                </div>
              </div>

              {/* DESKTOP VIEW: Semester Table with CGPA Input Field (hidden md:block) */}
              <div className="hidden md:block overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100/80 text-slate-800 border-b border-slate-200">
                      <th className="py-3 px-4 font-bold">Semester</th>
                      <th className="py-3 px-3 font-bold">Term</th>
                      <th className="py-3 px-4 font-bold">CGPA</th>
                      <th className="py-3 px-3 font-bold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {ALL_SEMESTER_TERMS.map((termDef) => {
                      const record = academicForm.semesterRecords.find((r) => r.semNumber === termDef.semNumber) || {
                        term: termDef.term,
                        semNumber: termDef.semNumber,
                        cgpa: null,
                        status: 'Upcoming'
                      };

                      const isCompletedEligible = termDef.semNumber <= maxCompletedSem;
                      const isOngoing = termDef.semNumber === maxCompletedSem + 1;

                      return (
                        <tr key={termDef.term} className={isCompletedEligible ? 'hover:bg-slate-50' : 'bg-slate-50/50'}>
                          <td className="py-3 px-4 font-bold text-slate-900">
                            {termDef.title}
                          </td>
                          <td className="py-3 px-3 font-mono font-bold text-[#5E8881]">
                            {termDef.term}
                          </td>

                          {/* CGPA Input (Eligible Completed Semesters Only) */}
                          <td className="py-2.5 px-4">
                            {isCompletedEligible ? (
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                max="10"
                                placeholder="e.g. 8.50"
                                value={record.cgpa !== null ? record.cgpa : ''}
                                onChange={(e) => handleSemesterInputChange(termDef.semNumber, 'cgpa', e.target.value)}
                                className="w-28 p-1.5 rounded-lg border border-slate-300 bg-white font-bold text-emerald-700 outline-none focus:ring-1 focus:ring-[#5E8881]"
                              />
                            ) : (
                              <span className="text-slate-400 font-medium">
                                {isOngoing ? 'Current Ongoing' : 'Locked'}
                              </span>
                            )}
                          </td>

                          {/* Status */}
                          <td className="py-3 px-3">
                            {isCompletedEligible ? (
                              record.cgpa !== null ? (
                                <span className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                                  Updated
                                </span>
                              ) : (
                                <span className="inline-block px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px]">
                                  Pending Entry
                                </span>
                              )
                            ) : isOngoing ? (
                              <span className="inline-block px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold text-[10px]">
                                Ongoing (Current)
                              </span>
                            ) : (
                              <span className="inline-block px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-600 font-bold text-[10px]">
                                Upcoming
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* MOBILE DEDICATED VIEW: Semester CGPA Cards (md:hidden) */}
              <div className="md:hidden space-y-3">
                {ALL_SEMESTER_TERMS.map((termDef) => {
                  const record = academicForm.semesterRecords.find((r) => r.semNumber === termDef.semNumber) || {
                    term: termDef.term,
                    semNumber: termDef.semNumber,
                    cgpa: null,
                    status: 'Upcoming'
                  };

                  const isCompletedEligible = termDef.semNumber <= maxCompletedSem;
                  const isOngoing = termDef.semNumber === maxCompletedSem + 1;

                  return (
                    <div
                      key={termDef.term}
                      className={`p-3.5 rounded-2xl border transition-all ${
                        isCompletedEligible
                          ? 'bg-white border-[#D4CAB4] shadow-xs'
                          : 'bg-slate-50/70 border-slate-200/60 opacity-80'
                      }`}
                    >
                      {/* Card Top Row: Semester Title, Term badge, and Status pill */}
                      <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-900">{termDef.title}</span>
                          <span className="px-2 py-0.5 rounded-full font-mono font-bold text-[10px] bg-[#5E8881]/15 text-[#5E8881]">
                            Term {termDef.term}
                          </span>
                        </div>

                        {isCompletedEligible ? (
                          record.cgpa !== null ? (
                            <span className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                              Updated
                            </span>
                          ) : (
                            <span className="inline-block px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px]">
                              Pending Entry
                            </span>
                          )
                        ) : isOngoing ? (
                          <span className="inline-block px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold text-[10px]">
                            Ongoing (Current)
                          </span>
                        ) : (
                          <span className="inline-block px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-600 font-bold text-[10px]">
                            Upcoming
                          </span>
                        )}
                      </div>

                      {/* Card Body: CGPA Input or locked message */}
                      <div className="pt-2.5">
                        {isCompletedEligible ? (
                          <div className="space-y-1">
                            <label
                              htmlFor={`m-cgpa-${termDef.term}`}
                              className="block text-[11px] font-bold text-slate-700"
                            >
                              Enter Verified CGPA:
                            </label>
                            <input
                              id={`m-cgpa-${termDef.term}`}
                              type="number"
                              step="0.01"
                              min="0"
                              max="10"
                              placeholder="e.g. 8.50"
                              value={record.cgpa !== null ? record.cgpa : ''}
                              onChange={(e) => handleSemesterInputChange(termDef.semNumber, 'cgpa', e.target.value)}
                              className="w-full p-2.5 rounded-xl border border-slate-300 bg-white font-extrabold text-sm text-emerald-800 outline-none focus:ring-1 focus:ring-[#5E8881]"
                            />
                          </div>
                        ) : isOngoing ? (
                          <p className="text-[11px] text-blue-700 bg-blue-50/70 p-2 rounded-xl font-medium">
                            Currently ongoing semester. Grades will be entered after examination results.
                          </p>
                        ) : (
                          <p className="text-[11px] text-slate-500 bg-slate-100/60 p-2 rounded-xl font-medium">
                            Upcoming semester (locked).
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Explicit Action Buttons: Save Academic Details & Cancel */}
              <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={handleCancelAcademicDetails}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-colors cursor-pointer text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-[#5E8881] hover:bg-[#4A6F68] text-white font-bold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Academic Details</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 4: UPDATE REQUESTS                                         */}
        {/* ============================================================== */}
        {activeTab === 'requests' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#D4CAB4] shadow-sm space-y-6">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900">
                Department Academic Update Requests
              </h3>
              <p className="text-xs text-slate-500">
                Active requests created by the HOD specifically for your academic year ({activeStudent.year}).
              </p>
            </div>

            {targetedRequests.length === 0 ? (
              <div className="p-8 rounded-2xl bg-slate-50 border border-slate-200 text-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                <h4 className="font-bold text-slate-800 text-sm">No Pending Requests</h4>
                <p className="text-xs text-slate-500 mt-1">
                  There are currently no active update requests targeting {activeStudent.year} students.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {targetedRequests.map((req) => {
                  const isSubmitted = isStudentSubmittedForRequest(activeStudent, req);
                  const matchingRecord = (activeStudent.semesterRecords || []).find((r) => r.term === req.targetSemester);

                  return (
                    <div
                      key={req.id}
                      className={`p-5 rounded-2xl border ${
                        isSubmitted
                          ? 'bg-emerald-50 border-emerald-300'
                          : 'bg-amber-50 border-amber-300'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-sm text-slate-900">{req.title}</h4>
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              isSubmitted ? 'bg-emerald-200 text-emerald-900' : 'bg-amber-200 text-amber-900'
                            }`}>
                              {isSubmitted ? 'Submitted & Confirmed' : 'Submission Pending'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 mt-1">
                            {req.instructions}
                          </p>
                          <div className="mt-2 flex items-center gap-4 text-[11px] text-slate-500">
                            <span>Target: {req.targetYear} &bull; Semester {req.targetSemester}</span>
                            <span>Deadline: {req.deadline}</span>
                          </div>
                        </div>

                        <div>
                          {isSubmitted ? (
                            <div className="text-right text-xs">
                              <span className="font-bold text-emerald-800 block">
                                CGPA: {matchingRecord?.cgpa?.toFixed(2)}
                              </span>
                              <span className="text-[10px] text-emerald-600">Record Satisfies Request</span>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setActiveTab('academics')}
                              className="px-4 py-2 rounded-xl bg-[#E8213A] hover:bg-[#C7152D] text-white font-bold text-xs shadow-md transition-all cursor-pointer"
                            >
                              Update {req.targetSemester} Now
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-[#D4CAB4] py-4 text-center text-xs text-slate-600">
        <p>
          &copy; {new Date().getFullYear()} {BRANDING.collegeName} &bull; {BRANDING.departmentName} &bull; Student Academic Portal
        </p>
      </footer>
    </div>
  );
}

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
  Info
} from 'lucide-react';
import BRANDING from '../../config/branding';
import CollegeLogo from '../../components/CollegeLogo';
import { useAuth } from '../../context/AuthContext';
import { getMaxCompletedSemForTerm, getStudentLatestAcademics, ALL_SEMESTER_TERMS, getTermsForYear, YEAR_ALLOWED_TERMS } from '../../data/mockData';
import { useTheme } from '../../context/ThemeContext';
import { THEMES } from '../../config/theme';

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
    updateStudentAcademicDetails,
    updateRequests,
    isStudentSubmittedForRequest
  } = useAuth();

  // Student Navigation strictly limited to the 4 required sections:
  // 1. My Dashboard | 2. My Portfolio | 3. Academic Details | 4. Update Requests
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'profile' | 'academics' | 'requests'

  const [toastMessage, setToastMessage] = useState(null);

  // ==========================================
  // SECTION 2: STUDENT PROFILE FORM STATE
  // Explicit Save / Cancel behaviour: No automatic saving!
  // ==========================================
  const [profileForm, setProfileForm] = useState({
    name: activeStudent.name,
    registerNumber: activeStudent.registerNumber,
    email: activeStudent.email,
    phone: activeStudent.phone,
    location: activeStudent.location,
    year: activeStudent.year,
    term: activeStudent.term,
    profilePhoto: activeStudent.profilePhoto,
  });

  const [photoPreview, setPhotoPreview] = useState(activeStudent.profilePhoto);
  const [isProfileDirty, setIsProfileDirty] = useState(false);

  // Reset form whenever active student changes
  useEffect(() => {
    setProfileForm({
      name: activeStudent.name,
      registerNumber: activeStudent.registerNumber,
      email: activeStudent.email,
      phone: activeStudent.phone,
      location: activeStudent.location,
      year: activeStudent.year,
      term: activeStudent.term,
      profilePhoto: activeStudent.profilePhoto,
    });
    setPhotoPreview(activeStudent.profilePhoto);
    setIsProfileDirty(false);
  }, [activeStudent]);

  const handleProfileFieldChange = (field, value) => {
    setProfileForm((prev) => ({ ...prev, [field]: value }));
    setIsProfileDirty(true);
  };

  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result);
        setProfileForm((prev) => ({ ...prev, profilePhoto: reader.result }));
        setIsProfileDirty(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = (e) => {
    e.preventDefault();
    updateStudentProfile(activeStudent.id, profileForm);
    setIsProfileDirty(false);
    setToastMessage('Profile changes saved successfully!');
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleCancelProfile = () => {
    setProfileForm({
      name: activeStudent.name,
      registerNumber: activeStudent.registerNumber,
      email: activeStudent.email,
      phone: activeStudent.phone,
      location: activeStudent.location,
      year: activeStudent.year,
      term: activeStudent.term,
      profilePhoto: activeStudent.profilePhoto,
    });
    setPhotoPreview(activeStudent.profilePhoto);
    setIsProfileDirty(false);
  };

  // ==========================================
  // SECTION 3: ACADEMIC DETAILS FORM STATE
  // Explicit Save / Cancel behaviour: No automatic saving!
  // ==========================================
  const [academicForm, setAcademicForm] = useState({
    sscPercentage: activeStudent.sscPercentage,
    interType: activeStudent.interType,
    interPercentage: activeStudent.interPercentage,
    semesterRecords: JSON.parse(JSON.stringify(activeStudent.semesterRecords || [])),
  });

  const [isAcademicDirty, setIsAcademicDirty] = useState(false);

  useEffect(() => {
    setAcademicForm({
      sscPercentage: activeStudent.sscPercentage,
      interType: activeStudent.interType,
      interPercentage: activeStudent.interPercentage,
      semesterRecords: JSON.parse(JSON.stringify(activeStudent.semesterRecords || [])),
    });
    setIsAcademicDirty(false);
  }, [activeStudent]);

  // Max completed semester number based on current term
  const maxCompletedSem = getMaxCompletedSemForTerm(activeStudent.term);

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

  const handleSaveAcademicDetails = (e) => {
    e.preventDefault();
    updateStudentAcademicDetails(activeStudent.id, academicForm);
    setIsAcademicDirty(false);
    setToastMessage('Academic details saved and updated successfully!');
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleCancelAcademicDetails = () => {
    setAcademicForm({
      sscPercentage: activeStudent.sscPercentage,
      interType: activeStudent.interType,
      interPercentage: activeStudent.interPercentage,
      semesterRecords: JSON.parse(JSON.stringify(activeStudent.semesterRecords || [])),
    });
    setIsAcademicDirty(false);
  };

  // ==========================================
  // SECTION 5: YEAR-SPECIFIC REQUESTS FILTERING
  // Requests appear ONLY for the selected eligible year!
  // ==========================================
  const targetedRequests = useMemo(() => {
    return updateRequests.filter((r) => r.targetYear === activeStudent.year);
  }, [updateRequests, activeStudent.year]);

  // Count only genuinely PENDING requests for the currently logged-in student
  const pendingRequestsCount = useMemo(() => {
    return targetedRequests.filter((r) => !isStudentSubmittedForRequest(activeStudent, r)).length;
  }, [targetedRequests, activeStudent, isStudentSubmittedForRequest]);

  const latestAcademics = getStudentLatestAcademics(activeStudent);

  const handleLogout = () => {
    logout();
    navigate('/student/login');
  };

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
        {/* Toast Feedback */}
        {toastMessage && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-medium flex items-center justify-between shadow-sm animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>{toastMessage}</span>
            </div>
            <button onClick={() => setToastMessage(null)} className="text-emerald-700 hover:text-emerald-900 cursor-pointer">
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
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#D4CAB4] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl overflow-hidden bg-slate-100 border-2 border-[#7FA8A1] shadow-sm flex items-center justify-center text-slate-400 font-bold text-lg flex-shrink-0">
                  {activeStudent.profilePhoto ? (
                    <img src={activeStudent.profilePhoto} alt={activeStudent.name} className="w-full h-full object-cover" />
                  ) : (
                    <span>{activeStudent.name.substring(0, 2).toUpperCase()}</span>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-slate-900">
                      Welcome, {activeStudent.name}
                    </h2>
                    <span className="px-2 py-0.5 rounded-md bg-[#7FA8A1]/20 text-[#3D6660] text-xs font-mono font-bold">
                      {activeStudent.registerNumber}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {activeStudent.year} &bull; Semester Term {activeStudent.term} &bull; {BRANDING.departmentAbbr}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start md:self-auto">
                <button
                  type="button"
                  onClick={() => setActiveTab('profile')}
                  className="px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-xs font-bold text-slate-700 transition-colors cursor-pointer"
                >
                  Edit Profile
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('academics')}
                  className="px-4 py-2 rounded-xl bg-[#5E8881] hover:bg-[#4A6F68] text-white text-xs font-bold shadow-sm transition-colors cursor-pointer"
                >
                  Academic Details
                </button>
              </div>
            </div>

            {/* Academic Highlights Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
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
                  Profile Photo (Upload &amp; Preview)
                </label>
                <div className="flex items-center gap-5">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden bg-slate-100 border-2 border-[#7FA8A1] shadow-sm flex items-center justify-center text-slate-400 font-bold">
                    {photoPreview ? (
                      <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-10 h-10 text-[#5E8881]" />
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <label
                      htmlFor="profile-photo-input"
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#5E8881] hover:bg-[#4A6F68] text-white text-xs font-bold shadow-sm cursor-pointer transition-colors"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>Select New Image</span>
                      <input
                        id="profile-photo-input"
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoSelect}
                        className="hidden"
                      />
                    </label>
                    <p className="text-[11px] text-slate-500">
                      Supports PNG, JPG, WebP. Selected photo previews immediately.
                    </p>
                  </div>
                </div>
              </div>

              {/* Editable Fields Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* Full Name */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1" htmlFor="prof-name">
                    Full Name
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

                {/* Register Number */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1" htmlFor="prof-regno">
                    Register Number
                  </label>
                  <input
                    id="prof-regno"
                    type="text"
                    required
                    value={profileForm.registerNumber}
                    onChange={(e) => handleProfileFieldChange('registerNumber', e.target.value.toUpperCase())}
                    className="w-full p-2.5 rounded-xl border border-slate-300 outline-none focus:ring-1 focus:ring-[#5E8881] text-sm font-mono font-bold"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1" htmlFor="prof-email">
                    Official Student Email
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
                    Contact Number
                  </label>
                  <input
                    id="prof-phone"
                    type="text"
                    required
                    value={profileForm.phone}
                    onChange={(e) => handleProfileFieldChange('phone', e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 outline-none focus:ring-1 focus:ring-[#5E8881]"
                  />
                </div>

                {/* Location */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1" htmlFor="prof-loc">
                    Current Location / Town
                  </label>
                  <input
                    id="prof-loc"
                    type="text"
                    required
                    value={profileForm.location}
                    onChange={(e) => handleProfileFieldChange('location', e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 outline-none focus:ring-1 focus:ring-[#5E8881]"
                  />
                </div>

                {/* Academic Year Options: 2nd Year, 3rd Year, 4th Year */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1" htmlFor="prof-year">
                    Current Academic Year
                  </label>
                  <select
                    id="prof-year"
                    value={profileForm.year}
                    onChange={(e) => {
                      const year = e.target.value;
                      const allowed = getTermsForYear(year);
                      setProfileForm((prev) => ({
                        ...prev,
                        year,
                        term: allowed.includes(prev.term) ? prev.term : (allowed[0] || '')
                      }));
                      setIsProfileDirty(true);
                    }}
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-white outline-none focus:ring-1 focus:ring-[#5E8881] font-semibold"
                  >
                    <option value="2nd Year">Second Year (2nd Year)</option>
                    <option value="3rd Year">Third Year (3rd Year)</option>
                    <option value="4th Year">Fourth Year (4th Year)</option>
                  </select>
                </div>

                {/* Term Options strictly filtered by selected year */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1" htmlFor="prof-term">
                    Current Semester / Term
                  </label>
                  <select
                    id="prof-term"
                    value={profileForm.term}
                    onChange={(e) => handleProfileFieldChange('term', e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-white outline-none focus:ring-1 focus:ring-[#5E8881] font-semibold"
                  >
                    {getTermsForYear(profileForm.year).map((term) => (
                      <option key={term} value={term}>
                        Term {term} ({profileForm.year})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Explicit Action Buttons: Save Changes & Cancel */}
              <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={handleCancelProfile}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-colors cursor-pointer text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-[#5E8881] hover:bg-[#4A6F68] text-white font-bold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Changes</span>
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

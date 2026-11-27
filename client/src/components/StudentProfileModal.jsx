import React, { useEffect } from 'react';
import { 
  X, 
  ArrowLeft, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  GraduationCap, 
  BookOpen, 
  Award, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Building2,
  FileText,
  Key,
  UserX,
  Trash2,
  ShieldCheck,
  Info
} from 'lucide-react';
import { ALL_SEMESTER_TERMS, getMaxCompletedSemForTerm } from '../data/mockData';
import { getBatchLabel, getMaxCompletedSemesters } from '../utils/academicYearMapping';

/**
 * StudentProfileModal
 * Comprehensive, institutional student profile view for HOD
 * - Desktop: Professional large modal
 * - Mobile: Dedicated full-screen view
 * Strictly complies with AIML Department branding (Sage Fog, Claret Wine, Tangerine Flash)
 * Zero mentions of SGPA.
 */
export default function StudentProfileModal({ 
  student, 
  isOpen, 
  onClose, 
  latestAcademics,
  onResetPassword,
  onToggleStatus,
  onDeleteStudent
}) {
  // Prevent background scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      const handleKeyDown = (e) => {
        if (e.key === 'Escape') onClose();
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = '';
        window.removeEventListener('keydown', handleKeyDown);
      };
    } else {
      document.body.style.overflow = '';
    }
  }, [isOpen, onClose]);

  if (!isOpen || !student) return null;

  const isPending = student.onboardingStatus === 'Profile Pending';
  const currentYearNum = student.currentYear || parseInt(String(student.year || '').replace(/\D/g, ''), 10);
  const currentTermNum = student.currentTerm || (student.term && String(student.term).includes('-') ? parseInt(String(student.term).split('-')[1], 10) : parseInt(String(student.term || '').replace(/\D/g, ''), 10)) || 1;

  const maxCompletedSem = (currentYearNum && currentYearNum >= 2)
    ? getMaxCompletedSemesters(currentYearNum, currentTermNum)
    : 0;

  // Determine semester records status
  const semesterTableData = ALL_SEMESTER_TERMS.map((item) => {
    const isEligible = !isPending && maxCompletedSem > 0 && item.semNumber <= maxCompletedSem;
    const rec = (student.semesterRecords || []).find(
      (r) => r.semesterNumber === item.semNumber || r.semNumber === item.semNumber || r.term === item.term || r.term === `Semester ${item.semNumber}`
    );
    const hasCgpa = rec && rec.cgpa !== null && rec.cgpa !== undefined && rec.cgpa !== '';

    let updateStatus = 'Not Applicable';
    let statusBadgeClass = 'bg-slate-100 text-slate-500 border-slate-200';
    let displayCgpa = '—';

    if (isPending) {
      updateStatus = 'Profile Pending';
      statusBadgeClass = 'bg-amber-50 text-amber-800 border-amber-200';
      displayCgpa = 'Not Provided';
    } else if (isEligible) {
      if (hasCgpa && Number(rec.cgpa) > 0) {
        updateStatus = 'Updated';
        statusBadgeClass = 'bg-emerald-50 text-emerald-800 border-emerald-300 font-bold';
        displayCgpa = Number(rec.cgpa).toFixed(2);
      } else {
        updateStatus = 'Pending Submission';
        statusBadgeClass = 'bg-amber-50 text-amber-800 border-amber-300 font-bold';
        displayCgpa = 'Pending';
      }
    } else {
      updateStatus = 'Upcoming / Ongoing';
      statusBadgeClass = 'bg-slate-100 text-slate-400 border-slate-200';
      displayCgpa = '—';
    }

    return {
      term: item.term,
      semNumber: item.semNumber,
      title: item.title,
      year: item.year,
      cgpa: displayCgpa,
      updateStatus,
      statusBadgeClass,
      isEligible
    };
  });

  const updatedSemCount = semesterTableData.filter((s) => s.updateStatus === 'Updated').length;
  const eligibleSemCount = semesterTableData.filter((s) => s.isEligible).length;

  let complianceStatusText = 'No Academic Records';
  let complianceBadgeClass = 'bg-slate-100 text-slate-700 border-slate-300';
  let complianceIconClass = 'bg-slate-200 text-slate-700';

  if (isPending || eligibleSemCount === 0) {
    complianceStatusText = 'No Academic Records';
    complianceBadgeClass = 'bg-slate-100 text-slate-600 border-slate-300';
    complianceIconClass = 'bg-slate-100 text-slate-600';
  } else if (updatedSemCount === 0) {
    complianceStatusText = 'Pending Submissions';
    complianceBadgeClass = 'bg-amber-100 text-amber-800 border-amber-300';
    complianceIconClass = 'bg-amber-100 text-amber-800';
  } else if (updatedSemCount < eligibleSemCount) {
    complianceStatusText = 'Partially Submitted';
    complianceBadgeClass = 'bg-blue-100 text-blue-800 border-blue-300';
    complianceIconClass = 'bg-blue-100 text-blue-800';
  } else {
    complianceStatusText = 'All Required Records Submitted';
    complianceBadgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-300';
    complianceIconClass = 'bg-emerald-100 text-emerald-800';
  }

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex md:items-center md:justify-center p-0 md:p-4 lg:p-6"
      onClick={onClose}
    >
      <div 
        className="w-full min-h-screen md:min-h-0 md:max-w-4xl bg-[#F8F9F6] md:rounded-3xl shadow-2xl border-0 md:border md:border-[#C1C8B7] flex flex-col max-h-none md:max-h-[92vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ============================================================== */}
        {/* MODAL HEADER: Institutional Title & Close Actions              */}
        {/* ============================================================== */}
        <div className="bg-[#4A192B] text-white p-4 sm:p-5 flex items-center justify-between gap-3 sticky top-0 z-20 shadow-md">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Mobile Back Button */}
            <button
              type="button"
              onClick={onClose}
              className="md:hidden p-1.5 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white transition-all cursor-pointer mr-1"
              aria-label="Back to Student Directory"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div className="w-9 h-9 rounded-xl bg-[#FF6B1A] text-white flex items-center justify-center font-black text-sm shrink-0 shadow-xs">
              AIML
            </div>

            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold truncate tracking-tight text-white">
                Official Student Profile
              </h2>
              <p className="text-[10px] sm:text-xs text-[#D7DCCF] truncate">
                DVR &amp; Dr. HS MIC College of Technology &bull; Department of AIML
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/15 text-white uppercase tracking-wider">
              Confidential Academic Record
            </span>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white transition-all cursor-pointer"
              aria-label="Close Profile"
              title="Close (Esc)"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* ============================================================== */}
        {/* MODAL BODY (Scrollable)                                        */}
        {/* ============================================================== */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">
          
          {/* SECTION 1: STUDENT IDENTITY HERO CARD */}
          <section className="bg-white rounded-3xl p-5 sm:p-6 border border-[#C1C8B7] shadow-sm relative overflow-hidden">
            {/* Background Accent Bar */}
            <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-[#4A192B] via-[#FF6B1A] to-[#4A192B]" />

            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 pt-1">
              {/* Profile Photo / Prominent Avatar */}
              <div className="relative shrink-0">
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden bg-[#D7DCCF] border-3 border-[#4A192B] shadow-md flex items-center justify-center text-[#4A192B] font-extrabold text-2xl">
                  {student.profilePhoto ? (
                    <img 
                      src={student.profilePhoto} 
                      alt={student.name} 
                      className="w-full h-full object-cover" 
                    />
                  ) : (
                    <span>{student.name.substring(0, 2).toUpperCase()}</span>
                  )}
                </div>
                <div className="absolute -bottom-2 -right-2 px-2 py-0.5 rounded-md bg-[#FF6B1A] text-white font-mono font-bold text-[10px] shadow-xs">
                  {student.term && student.term !== 'Not Provided' ? student.term : 'Pending'}
                </div>
              </div>

              {/* Identity Details */}
              <div className="text-center sm:text-left flex-1 min-w-0 space-y-2">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#4A192B]/10 text-[#4A192B]">
                    {student.year && student.year !== 'Not Provided' ? student.year : 'Year: Pending'}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FF6B1A]/10 text-[#FF6B1A]">
                    {student.batch || getBatchLabel(currentYearNum)}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 font-mono">
                    {student.term && student.term !== 'Not Provided' ? `Term ${student.term}` : 'Term: Pending'}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${
                    isPending ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${isPending ? 'bg-amber-600' : 'bg-emerald-600'}`}></span>
                    <span>{isPending ? 'Profile Pending' : (student.studentStatus || 'Active Student')}</span>
                  </span>
                </div>

                <h3 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
                  {isPending && (!student.name || student.name === 'Profile Pending') 
                    ? 'Profile Pending' 
                    : student.name}
                </h3>

                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-xs">
                  <div className="px-3 py-1 rounded-xl bg-slate-100 border border-slate-200">
                    <span className="text-slate-500 text-[10px] uppercase font-bold block">Register Number</span>
                    <span className="font-mono font-extrabold text-sm text-[#4A192B]">{student.registerNumber}</span>
                  </div>

                  <div className="px-3 py-1 rounded-xl bg-slate-100 border border-slate-200">
                    <span className="text-slate-500 text-[10px] uppercase font-bold block">Location</span>
                    <span className="font-bold text-slate-800 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>{student.location || 'Not Provided'}</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Pending Onboarding Informational Alert */}
          {isPending && (
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 text-xs flex items-start gap-2.5 shadow-xs">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="font-bold">Student Profile Pending Onboarding</p>
                <p className="text-[11px] text-amber-800">
                  This account was created by HOD. The student has not completed their profile yet. All missing details are displayed as "Not Provided".
                </p>
              </div>
            </div>
          )}

          {/* SECTION 2 & 3: PERSONAL INFORMATION & PREVIOUS ACADEMICS GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            
            {/* SECTION 2: PERSONAL INFORMATION */}
            <section className="bg-white rounded-3xl p-5 border border-[#C1C8B7] shadow-sm space-y-3.5">
              <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100">
                <div className="w-7 h-7 rounded-lg bg-[#4A192B]/10 text-[#4A192B] flex items-center justify-center">
                  <User className="w-4 h-4" />
                </div>
                <h4 className="font-bold text-sm text-slate-900">Personal &amp; Contact Details</h4>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <Mail className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Email Address</span>
                    {student.email ? (
                      <a href={`mailto:${student.email}`} className="font-semibold text-[#4A192B] hover:underline truncate block">
                        {student.email}
                      </a>
                    ) : (
                      <span className="text-slate-400 italic">Not Provided</span>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <Phone className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Contact Phone</span>
                    {student.phone ? (
                      <a href={`tel:${student.phone}`} className="font-semibold text-slate-800 hover:underline">
                        {student.phone}
                      </a>
                    ) : (
                      <span className="text-slate-400 italic">Not Provided</span>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <Building2 className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Campus / Department</span>
                    <span className="font-semibold text-slate-800">
                      DVR &amp; Dr. HS MIC College of Technology &bull; AIML
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {/* SECTION 3: PREVIOUS ACADEMIC DETAILS */}
            <section className="bg-white rounded-3xl p-5 border border-[#C1C8B7] shadow-sm space-y-3.5">
              <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100">
                <div className="w-7 h-7 rounded-lg bg-[#FF6B1A]/10 text-[#FF6B1A] flex items-center justify-center">
                  <GraduationCap className="w-4 h-4" />
                </div>
                <h4 className="font-bold text-sm text-slate-900">Previous Academic Foundation</h4>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                {/* SSC Percentage */}
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">
                    SSC / 10th Class
                  </span>
                  <div className="mt-2">
                    {student.sscPercentage !== undefined && student.sscPercentage !== null ? (
                      <div className="text-xl font-black text-slate-900">
                        {student.sscPercentage}%
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 italic">Not Provided</span>
                    )}
                    <span className="text-[10px] text-slate-500">Secondary Education</span>
                  </div>
                </div>

                {/* Intermediate / Diploma Percentage */}
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block truncate">
                    {student.interType || 'Inter / Diploma'}
                  </span>
                  <div className="mt-2">
                    {student.interPercentage !== undefined && student.interPercentage !== null ? (
                      <div className="text-xl font-black text-[#4A192B]">
                        {student.interPercentage}%
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 italic">Not Provided</span>
                    )}
                    <span className="text-[10px] text-slate-500">
                      Type: {student.interType || 'Not Provided'}
                    </span>
                  </div>
                </div>

                {/* Backlog Standing Card */}
                <div className="col-span-2 p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">
                      Backlog Academic Status
                    </span>
                    <div className="mt-1">
                      {student.hasBacklogs === false ? (
                        <span className="inline-flex items-center gap-1.5 text-emerald-800 font-extrabold text-sm">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>No Backlogs (Clean Record)</span>
                        </span>
                      ) : student.hasBacklogs === true ? (
                        <span className="inline-flex items-center gap-1.5 text-rose-800 font-extrabold text-sm">
                          <AlertCircle className="w-4 h-4 text-rose-600" />
                          <span>{student.backlogCount || 1} Active Backlog{(student.backlogCount || 1) > 1 ? 's' : ''}</span>
                        </span>
                      ) : (
                        <span className="text-slate-400 italic text-xs">Not Provided</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">Total Count</span>
                    <span className="text-sm font-mono font-extrabold text-slate-800">
                      {student.hasBacklogs === true ? `${student.backlogCount || 1}` : student.hasBacklogs === false ? '0' : '—'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/80 text-[11px] text-amber-900 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <p>
                  Previous education percentages and backlog standing are officially archived department records.
                </p>
              </div>
            </section>
          </div>

          {/* SECTION 3B: ACCOUNT STATUS & HOD ADMINISTRATIVE CONTROLS */}
          <section className="bg-white rounded-3xl p-5 border border-[#C1C8B7] shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#4A192B]/10 text-[#4A192B] flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900">Account Status &amp; Administrative Controls</h4>
                  <p className="text-[11px] text-slate-500">Security flags, account status, and credential management.</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Account Status</span>
                <span className={`font-extrabold text-sm mt-1 block ${student.is_active || student.studentStatus === 'Active' ? 'text-emerald-700' : 'text-slate-500'}`}>
                  {student.is_active || student.studentStatus === 'Active' ? 'Active' : 'Inactive / Deactivated'}
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Profile Onboarding</span>
                <span className={`font-extrabold text-sm mt-1 block ${student.onboardingStatus === 'Profile Completed' ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {student.onboardingStatus || 'Profile Pending'}
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Security Gate</span>
                <span className="font-extrabold text-sm mt-1 block text-slate-800">
                  {student.mustChangePassword ? 'Password Reset Pending' : 'Secure (Updated)'}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 pt-1 border-t border-slate-100">
              {onResetPassword && (
                <button
                  type="button"
                  onClick={() => onResetPassword(student)}
                  className="px-3.5 py-2 rounded-xl bg-[#4A192B] hover:bg-[#35101E] text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Key className="w-3.5 h-3.5 text-[#FF6B1A]" />
                  <span>Reset Password</span>
                </button>
              )}

              {onToggleStatus && (
                <button
                  type="button"
                  onClick={() => onToggleStatus(student)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    student.is_active || student.studentStatus === 'Active'
                      ? 'bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300'
                      : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border border-emerald-300'
                  }`}
                >
                  <UserX className="w-3.5 h-3.5" />
                  <span>{student.is_active || student.studentStatus === 'Active' ? 'Deactivate Student' : 'Reactivate Student'}</span>
                </button>
              )}

              {onDeleteStudent && (
                <button
                  type="button"
                  onClick={() => onDeleteStudent(student)}
                  className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ml-auto"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  <span>Delete Student</span>
                </button>
              )}
            </div>
          </section>

          {/* SECTION 4: B.TECH SEMESTER-WISE CGPA PERFORMANCE TABLE */}
          <section className="bg-white rounded-3xl p-5 sm:p-6 border border-[#C1C8B7] shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#4A192B]/10 text-[#4A192B] flex items-center justify-center">
                  <Award className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900">
                    B.Tech Semester-wise CGPA Performance
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Showing all 8 semesters. Only CGPA is tracked as the official academic metric.
                  </p>
                </div>
              </div>

              {/* Highlight chips for Latest Academics */}
              <div className="flex items-center gap-2 shrink-0">
                <div className="px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-right">
                  <span className="text-[9px] uppercase font-bold text-slate-500 block">Latest Completed</span>
                  <span className="font-extrabold text-xs text-slate-900">
                    {latestAcademics?.latestSemester ? `Sem ${latestAcademics.latestSemester}` : 'Not Provided'}
                  </span>
                </div>
                <div className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-300 text-right">
                  <span className="text-[9px] uppercase font-bold text-emerald-700 block">Latest CGPA</span>
                  <span className="font-black text-sm text-emerald-800">
                    {latestAcademics?.latestCgpa !== null && latestAcademics?.latestCgpa !== undefined
                      ? Number(latestAcademics.latestCgpa).toFixed(2)
                      : 'Not Provided'}
                  </span>
                </div>
              </div>
            </div>

            {/* Semester Performance Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#4A192B]/5 text-slate-800 border-b border-slate-200">
                    <th className="py-2.5 px-3 font-bold">Semester</th>
                    <th className="py-2.5 px-3 font-bold">Term</th>
                    <th className="py-2.5 px-3 font-bold">Academic Year</th>
                    <th className="py-2.5 px-3 font-bold text-center">CGPA</th>
                    <th className="py-2.5 px-3 font-bold text-center">Update Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {semesterTableData.map((row) => (
                    <tr 
                      key={row.term} 
                      className={`transition-colors ${row.isEligible ? 'hover:bg-slate-50' : 'bg-slate-50/50 opacity-70'}`}
                    >
                      <td className="py-2.5 px-3 font-semibold text-slate-900">
                        {row.title}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-[#4A192B]">
                        {row.term}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">
                        {row.year}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {row.cgpa !== '—' && row.cgpa !== 'Not Provided' ? (
                          <span className="px-2.5 py-0.5 rounded-lg bg-emerald-100 text-emerald-900 font-extrabold font-mono text-xs">
                            {row.cgpa}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-mono italic">{row.cgpa}</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] border ${row.statusBadgeClass}`}>
                          {row.updateStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="text-[10px] text-slate-500 italic">
              Note: Official cumulative performance is tracked across validated semester CGPA records. Simple arithmetic averaging is strictly avoided.
            </p>
          </section>

          {/* SECTION 5: ACADEMIC UPDATE STATUS SUMMARY */}
          <section className="bg-slate-50 rounded-2xl p-4 border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${complianceIconClass}`}>
                {eligibleSemCount > 0 && updatedSemCount === eligibleSemCount ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : eligibleSemCount > 0 && updatedSemCount > 0 ? (
                  <AlertCircle className="w-4 h-4" />
                ) : eligibleSemCount > 0 ? (
                  <Clock className="w-4 h-4" />
                ) : (
                  <Info className="w-4 h-4" />
                )}
              </div>
              <div>
                <span className="font-bold text-slate-800 block">
                  Cohort Update Record Compliance
                </span>
                <span className="text-[11px] text-slate-500">
                  {updatedSemCount} of {eligibleSemCount} eligible completed semesters validated.
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className={`px-3.5 py-1.5 rounded-full text-xs font-bold border shadow-xs ${complianceBadgeClass}`}>
                {complianceStatusText}
              </span>
            </div>
          </section>

        </div>

        {/* ============================================================== */}
        {/* MODAL FOOTER                                                   */}
        {/* ============================================================== */}
        <div className="p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-between gap-3 sticky bottom-0 z-20">
          <div className="text-[11px] text-slate-500 truncate hidden sm:block">
            Viewing student: <strong className="text-slate-800">{student.name}</strong> ({student.registerNumber})
          </div>

          <div className="flex items-center justify-end gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#4A192B] hover:bg-[#35101E] active:scale-95 text-white font-bold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4 text-[#FF6B1A]" />
              <span>Back to Directory</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

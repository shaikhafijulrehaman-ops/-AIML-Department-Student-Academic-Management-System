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
  FileText
} from 'lucide-react';
import { ALL_SEMESTER_TERMS, getMaxCompletedSemForTerm } from '../data/mockData';

/**
 * StudentProfileModal
 * Comprehensive, institutional student profile view for HOD
 * - Desktop: Professional large modal
 * - Mobile: Dedicated full-screen view
 * Strictly complies with AIML Department branding (Sage Fog, Claret Wine, Tangerine Flash)
 * Zero mentions of SGPA.
 */
export default function StudentProfileModal({ student, isOpen, onClose, latestAcademics }) {
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

  const maxCompletedSem = getMaxCompletedSemForTerm(student.term);

  // Determine semester records status
  const semesterTableData = ALL_SEMESTER_TERMS.map((item) => {
    const isEligible = item.semNumber <= maxCompletedSem;
    const rec = (student.semesterRecords || []).find((r) => r.term === item.term);
    const hasCgpa = rec && rec.cgpa !== null && rec.cgpa !== undefined;

    let updateStatus = 'Not Applicable';
    let statusBadgeClass = 'bg-slate-100 text-slate-500 border-slate-200';
    let displayCgpa = '—';

    if (isEligible) {
      if (hasCgpa && (rec.status === 'Updated' || rec.cgpa > 0)) {
        updateStatus = 'Updated';
        statusBadgeClass = 'bg-emerald-50 text-emerald-800 border-emerald-300 font-bold';
        displayCgpa = Number(rec.cgpa).toFixed(2);
      } else {
        updateStatus = 'Not Updated';
        statusBadgeClass = 'bg-amber-50 text-amber-800 border-amber-300 font-bold';
        displayCgpa = 'Not Provided';
      }
    } else {
      updateStatus = 'Not Applicable';
      statusBadgeClass = 'bg-slate-100 text-slate-500 border-slate-200';
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
                  {student.term}
                </div>
              </div>

              {/* Identity Details */}
              <div className="text-center sm:text-left flex-1 min-w-0 space-y-2">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#4A192B]/10 text-[#4A192B]">
                    {student.year}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 font-mono">
                    Term {student.term}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                    <span>{student.studentStatus || 'Active Student'}</span>
                  </span>
                </div>

                <h3 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
                  {student.name}
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
              </div>

              <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/80 text-[11px] text-amber-900 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <p>
                  Previous education percentages are officially archived from verified admission certificates.
                </p>
              </div>
            </section>
          </div>

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
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-4 h-4" />
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
              <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                updatedSemCount === eligibleSemCount 
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
                  : 'bg-amber-100 text-amber-800 border-amber-300'
              }`}>
                {updatedSemCount === eligibleSemCount ? 'All Records Completed' : 'Pending Semester Updates'}
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

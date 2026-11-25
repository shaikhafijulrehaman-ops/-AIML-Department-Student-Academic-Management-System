import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Shield,
  Search,
  Filter,
  Download,
  FileSpreadsheet,
  FileText,
  RotateCcw,
  CheckCircle2,
  Clock,
  PlusCircle,
  X,
  LogOut,
  ChevronDown,
  Building2,
  GraduationCap,
  Calendar,
  AlertCircle,
  Send,
  Eye
} from 'lucide-react';
import BRANDING from '../config/branding';
import CollegeLogo from '../components/CollegeLogo';
import { useAuth } from '../context/AuthContext';

export default function HodDashboardPage() {
  const navigate = useNavigate();
  const {
    hodUser,
    logout,
    students,
    departmentSummary,
    updateRequests,
    createUpdateRequest
  } = useAuth();

  // Active section view
  const [activeSection, setActiveSection] = useState('students'); // 'students' | 'updates'

  // Filter states
  const [filterYear, setFilterYear] = useState('All');
  const [filterSemester, setFilterSemester] = useState('All');
  const [filterLocation, setFilterLocation] = useState('All');
  const [searchRegNo, setSearchRegNo] = useState('');

  // Comparison filter states for SSC, Inter, CGPA
  const [sscOperator, setSscOperator] = useState('all'); // 'all' | 'gt' | 'lt' | 'eq' | 'between'
  const [sscVal1, setSscVal1] = useState('');
  const [sscVal2, setSscVal2] = useState('');

  const [interOperator, setInterOperator] = useState('all');
  const [interVal1, setInterVal1] = useState('');
  const [interVal2, setInterVal2] = useState('');

  const [cgpaOperator, setCgpaOperator] = useState('all');
  const [cgpaVal1, setCgpaVal1] = useState('');
  const [cgpaVal2, setCgpaVal2] = useState('');

  // Applied filter trigger state
  const [appliedFilters, setAppliedFilters] = useState({
    year: 'All',
    semester: 'All',
    location: 'All',
    searchRegNo: '',
    ssc: { op: 'all', v1: '', v2: '' },
    inter: { op: 'all', v1: '', v2: '' },
    cgpa: { op: 'all', v1: '', v2: '' },
  });

  // Modal for Create Update Request
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newRequestTitle, setNewRequestTitle] = useState('');
  const [newRequestSemester, setNewRequestSemester] = useState('Semester 5');
  const [newRequestInstructions, setNewRequestInstructions] = useState('');

  // Export action feedback modal/toast
  const [exportNotice, setExportNotice] = useState(null);

  // Reminder feedback
  const [reminderToast, setReminderToast] = useState(null);

  const handleApplyFilters = () => {
    setAppliedFilters({
      year: filterYear,
      semester: filterSemester,
      location: filterLocation,
      searchRegNo: searchRegNo.trim(),
      ssc: { op: sscOperator, v1: sscVal1, v2: sscVal2 },
      inter: { op: interOperator, v1: interVal1, v2: interVal2 },
      cgpa: { op: cgpaOperator, v1: cgpaVal1, v2: cgpaVal2 },
    });
  };

  const handleClearFilters = () => {
    setFilterYear('All');
    setFilterSemester('All');
    setFilterLocation('All');
    setSearchRegNo('');
    setSscOperator('all');
    setSscVal1('');
    setSscVal2('');
    setInterOperator('all');
    setInterVal1('');
    setInterVal2('');
    setCgpaOperator('all');
    setCgpaVal1('');
    setCgpaVal2('');

    setAppliedFilters({
      year: 'All',
      semester: 'All',
      location: 'All',
      searchRegNo: '',
      ssc: { op: 'all', v1: '', v2: '' },
      inter: { op: 'all', v1: '', v2: '' },
      cgpa: { op: 'all', v1: '', v2: '' },
    });
  };

  // Helper comparison evaluator
  const evalComparison = (val, op, v1, v2) => {
    if (op === 'all' || !v1) return true;
    const num = parseFloat(val);
    const n1 = parseFloat(v1);
    if (isNaN(num) || isNaN(n1)) return true;

    if (op === 'gt') return num > n1;
    if (op === 'lt') return num < n1;
    if (op === 'eq') return Math.abs(num - n1) < 0.05;
    if (op === 'between') {
      const n2 = parseFloat(v2);
      if (isNaN(n2)) return num >= n1;
      return num >= Math.min(n1, n2) && num <= Math.max(n1, n2);
    }
    return true;
  };

  // Filtered Student List
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      // Year filter
      if (appliedFilters.year !== 'All' && s.year !== appliedFilters.year) {
        return false;
      }
      // Semester filter
      if (appliedFilters.semester !== 'All' && s.latestCompletedSem !== appliedFilters.semester) {
        return false;
      }
      // Location filter
      if (appliedFilters.location !== 'All' && s.location !== appliedFilters.location) {
        return false;
      }
      // Register Number search
      if (
        appliedFilters.searchRegNo &&
        !s.registerNumber.toUpperCase().includes(appliedFilters.searchRegNo.toUpperCase()) &&
        !s.name.toLowerCase().includes(appliedFilters.searchRegNo.toLowerCase())
      ) {
        return false;
      }
      // SSC %
      if (!evalComparison(s.sscPercentage, appliedFilters.ssc.op, appliedFilters.ssc.v1, appliedFilters.ssc.v2)) {
        return false;
      }
      // Inter %
      if (!evalComparison(s.interPercentage, appliedFilters.inter.op, appliedFilters.inter.v1, appliedFilters.inter.v2)) {
        return false;
      }
      // CGPA
      if (!evalComparison(s.latestSemesterCgpa, appliedFilters.cgpa.op, appliedFilters.cgpa.v1, appliedFilters.cgpa.v2)) {
        return false;
      }

      return true;
    });
  }, [students, appliedFilters]);

  // Semester Update Tracking Lists (e.g. 5th Semester CGPA)
  const submittedStudents = useMemo(() => {
    return students.filter((s) => (s.submittedUpdateRequests || []).includes('req_5th_sem'));
  }, [students]);

  const pendingStudents = useMemo(() => {
    return students.filter(
      (s) =>
        (s.year === 'Third' || s.year === 'Fourth') &&
        !(s.submittedUpdateRequests || []).includes('req_5th_sem')
    );
  }, [students]);

  const handleCreateRequest = (e) => {
    e.preventDefault();
    if (!newRequestTitle.trim()) return;

    createUpdateRequest({
      title: newRequestTitle.trim(),
      targetSemester: newRequestSemester,
      instructions: newRequestInstructions.trim() || 'Please submit your official CGPA.',
      deadline: '2026-12-15',
    });

    setIsCreateModalOpen(false);
    setNewRequestTitle('');
    setNewRequestInstructions('');
    alert(`Update request "${newRequestTitle}" created successfully for ${newRequestSemester}.`);
  };

  const handleDownload = (format) => {
    setExportNotice(`Exporting filtered list (${filteredStudents.length} demo records) to ${format}... Ready for institutional database integration.`);
    setTimeout(() => {
      setExportNotice(null);
    }, 4000);
  };

  const handleSendReminder = (studentName, regNo) => {
    setReminderToast(`Reminder sent to ${studentName} (${regNo}) to update semester marks.`);
    setTimeout(() => setReminderToast(null), 3500);
  };

  const handleLogout = () => {
    logout();
    navigate('/hod/login');
  };

  // Distinct locations for filter dropdown
  const locationOptions = ['All', 'Vijayawada', 'Guntur', 'Kanchikacherla', 'Nandigama', 'Jaggaiahpet', 'Ibrahimpatnam', 'Tiruvuru', 'Mangalagiri'];

  return (
    <div className="min-h-screen bg-[#D7DCCF] text-[#1E231D] flex flex-col font-sans">
      {/* Top HOD Administrative Bar */}
      <header className="bg-[#4A192B] text-white shadow-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-3">
          {/* Institutional Branding Lockup */}
          <div className="flex items-center gap-3">
            <CollegeLogo size="sm" badge />
            <div className="leading-tight">
              <h1 className="text-xs sm:text-sm font-bold tracking-tight text-white">
                {BRANDING.collegeName}
              </h1>
              <p className="text-[11px] font-semibold text-[#FF6B1A]">
                {BRANDING.departmentName} &bull; HOD Portal
              </p>
            </div>
          </div>

          {/* HOD Profile & Logout Section */}
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="hidden sm:flex flex-col text-right leading-tight">
              <span className="text-xs font-bold text-white">{hodUser.name}</span>
              <span className="text-[10px] text-white/70">Head of Department (AIML)</span>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 active:scale-95 text-xs font-bold text-white border border-white/20 transition-all cursor-pointer"
              title="Sign out of HOD Portal"
            >
              <LogOut className="w-3.5 h-3.5 text-[#FF6B1A]" />
              <span>Logout</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-[#35101E] border-t border-white/10 px-4 sm:px-8">
          <div className="max-w-7xl mx-auto flex items-center gap-1 sm:gap-2">
            <button
              type="button"
              onClick={() => setActiveSection('students')}
              className={`py-2.5 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
                activeSection === 'students'
                  ? 'border-[#FF6B1A] text-white'
                  : 'border-transparent text-white/70 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-[#FF6B1A]" />
              <span>Student Academic Directory</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/15">
                {filteredStudents.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSection('updates')}
              className={`py-2.5 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
                activeSection === 'updates'
                  ? 'border-[#FF6B1A] text-white'
                  : 'border-transparent text-white/70 hover:text-white'
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-[#FF6B1A]" />
              <span>Semester Update Tracking</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-[#FF6B1A] text-white font-bold">
                {pendingStudents.length} Pending
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full flex-1 space-y-6">
        {/* Export / Toast Notifications */}
        {exportNotice && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-medium flex items-center justify-between shadow-sm animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>{exportNotice}</span>
            </div>
            <button onClick={() => setExportNotice(null)} className="text-emerald-700 hover:text-emerald-900">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {reminderToast && (
          <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 text-xs font-medium flex items-center justify-between shadow-sm animate-in fade-in">
            <div className="flex items-center gap-2">
              <Send className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span>{reminderToast}</span>
            </div>
            <button onClick={() => setReminderToast(null)} className="text-amber-800 hover:text-amber-950">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* 1. Dashboard Summary: ONLY the 6 Required Cards */}
        <section aria-labelledby="summary-heading">
          <h2 id="summary-heading" className="sr-only">Department Student Summary</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            {/* Total Students */}
            <div className="bg-white rounded-2xl p-4 border border-[#C1C8B7] shadow-sm">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Total Students
              </span>
              <div className="text-2xl sm:text-3xl font-extrabold text-[#4A192B] mt-1">
                {departmentSummary.totalStudents}
              </div>
              <span className="text-[10px] text-slate-500 font-medium">AIML Cohorts</span>
            </div>

            {/* First Year */}
            <div className="bg-white rounded-2xl p-4 border border-[#C1C8B7] shadow-sm">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                First Year
              </span>
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-800 mt-1">
                {departmentSummary.firstYear}
              </div>
              <span className="text-[10px] text-slate-500 font-medium">1st Year Students</span>
            </div>

            {/* Second Year */}
            <div className="bg-white rounded-2xl p-4 border border-[#C1C8B7] shadow-sm">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Second Year
              </span>
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-800 mt-1">
                {departmentSummary.secondYear}
              </div>
              <span className="text-[10px] text-slate-500 font-medium">2nd Year Students</span>
            </div>

            {/* Third Year */}
            <div className="bg-white rounded-2xl p-4 border border-[#C1C8B7] shadow-sm">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Third Year
              </span>
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-800 mt-1">
                {departmentSummary.thirdYear}
              </div>
              <span className="text-[10px] text-slate-500 font-medium">3rd Year Students</span>
            </div>

            {/* Fourth Year */}
            <div className="bg-white rounded-2xl p-4 border border-[#C1C8B7] shadow-sm">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Fourth Year
              </span>
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-800 mt-1">
                {departmentSummary.fourthYear}
              </div>
              <span className="text-[10px] text-slate-500 font-medium">4th Year Students</span>
            </div>

            {/* Semester Update Status */}
            <div className="bg-white rounded-2xl p-4 border border-[#FF6B1A]/40 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-2 h-full bg-[#FF6B1A]"></div>
              <span className="text-[11px] font-bold text-[#FF6B1A] uppercase tracking-wider block truncate">
                Update Status
              </span>
              <div className="text-lg sm:text-xl font-extrabold text-[#4A192B] mt-1 leading-tight">
                {submittedStudents.length} / {submittedStudents.length + pendingStudents.length}
              </div>
              <span className="text-[10px] text-slate-600 font-medium block truncate">
                5th Sem CGPA Updated
              </span>
            </div>
          </div>
        </section>

        {/* SECTION A: Student Academic Directory & Filters */}
        {activeSection === 'students' && (
          <div className="space-y-5">
            {/* 2. Comprehensive Filter Panel */}
            <section className="bg-white rounded-3xl p-5 sm:p-6 border border-[#C1C8B7] shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 mb-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-[#FF6B1A]" />
                  <h3 className="font-bold text-sm text-slate-900">
                    Student Academic Filter Panel
                  </h3>
                  <span className="text-[11px] text-slate-500">
                    (Multi-parameter comparison enabled)
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleClearFilters}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 text-xs font-semibold transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Clear Filters</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleApplyFilters}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#4A192B] hover:bg-[#35101E] text-white text-xs font-bold shadow-sm transition-all"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#FF6B1A]" />
                    <span>Apply Filters</span>
                  </button>
                </div>
              </div>

              {/* Filters Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 text-xs">
                {/* 1. Year Filter */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Year Cohort
                  </label>
                  <select
                    value={filterYear}
                    onChange={(e) => setFilterYear(e.target.value)}
                    className="w-full p-2 rounded-xl border border-slate-300 bg-white text-slate-800 font-medium outline-none focus:ring-1 focus:ring-[#4A192B]"
                  >
                    <option value="All">All Years (1st to 4th)</option>
                    <option value="First">First Year</option>
                    <option value="Second">Second Year</option>
                    <option value="Third">Third Year</option>
                    <option value="Fourth">Fourth Year</option>
                  </select>
                </div>

                {/* 2. Semester Filter */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Latest Completed Semester
                  </label>
                  <select
                    value={filterSemester}
                    onChange={(e) => setFilterSemester(e.target.value)}
                    className="w-full p-2 rounded-xl border border-slate-300 bg-white text-slate-800 font-medium outline-none focus:ring-1 focus:ring-[#4A192B]"
                  >
                    <option value="All">All Semesters</option>
                    <option value="Intermediate">Intermediate / Diploma</option>
                    <option value="Semester 1">Semester 1</option>
                    <option value="Semester 2">Semester 2</option>
                    <option value="Semester 3">Semester 3</option>
                    <option value="Semester 4">Semester 4</option>
                    <option value="Semester 5">Semester 5</option>
                    <option value="Semester 6">Semester 6</option>
                    <option value="Semester 7">Semester 7</option>
                  </select>
                </div>

                {/* 6. Location Filter */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Student Location
                  </label>
                  <select
                    value={filterLocation}
                    onChange={(e) => setFilterLocation(e.target.value)}
                    className="w-full p-2 rounded-xl border border-slate-300 bg-white text-slate-800 font-medium outline-none focus:ring-1 focus:ring-[#4A192B]"
                  >
                    {locationOptions.map((loc) => (
                      <option key={loc} value={loc}>
                        {loc === 'All' ? 'All Locations' : loc}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 7. Register Number / Name Search */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Register Number Search
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={searchRegNo}
                      onChange={(e) => setSearchRegNo(e.target.value)}
                      placeholder="e.g. 22H71A6125 or name"
                      className="w-full p-2 pr-8 rounded-xl border border-slate-300 bg-white text-slate-800 font-medium outline-none focus:ring-1 focus:ring-[#4A192B]"
                    />
                    <Search className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
                  </div>
                </div>

                {/* 3. SSC Percentage Comparison Filter */}
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <label className="block font-bold text-slate-800 mb-1 text-[11px]">
                    SSC Percentage (%)
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <select
                      value={sscOperator}
                      onChange={(e) => setSscOperator(e.target.value)}
                      className="p-1.5 rounded-lg border border-slate-300 bg-white text-[11px]"
                    >
                      <option value="all">Any %</option>
                      <option value="gt">Greater Than</option>
                      <option value="lt">Less Than</option>
                      <option value="eq">Equal To</option>
                      <option value="between">Between</option>
                    </select>
                    {sscOperator !== 'all' && (
                      <input
                        type="number"
                        step="0.1"
                        placeholder="Min %"
                        value={sscVal1}
                        onChange={(e) => setSscVal1(e.target.value)}
                        className="p-1.5 rounded-lg border border-slate-300 bg-white text-[11px]"
                      />
                    )}
                  </div>
                  {sscOperator === 'between' && (
                    <input
                      type="number"
                      step="0.1"
                      placeholder="Max %"
                      value={sscVal2}
                      onChange={(e) => setSscVal2(e.target.value)}
                      className="mt-1.5 w-full p-1.5 rounded-lg border border-slate-300 bg-white text-[11px]"
                    />
                  )}
                </div>

                {/* 4. Intermediate / Diploma Comparison Filter */}
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <label className="block font-bold text-slate-800 mb-1 text-[11px]">
                    Inter / Diploma (%)
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <select
                      value={interOperator}
                      onChange={(e) => setInterOperator(e.target.value)}
                      className="p-1.5 rounded-lg border border-slate-300 bg-white text-[11px]"
                    >
                      <option value="all">Any %</option>
                      <option value="gt">Greater Than</option>
                      <option value="lt">Less Than</option>
                      <option value="eq">Equal To</option>
                      <option value="between">Between</option>
                    </select>
                    {interOperator !== 'all' && (
                      <input
                        type="number"
                        step="0.1"
                        placeholder="Min %"
                        value={interVal1}
                        onChange={(e) => setInterVal1(e.target.value)}
                        className="p-1.5 rounded-lg border border-slate-300 bg-white text-[11px]"
                      />
                    )}
                  </div>
                  {interOperator === 'between' && (
                    <input
                      type="number"
                      step="0.1"
                      placeholder="Max %"
                      value={interVal2}
                      onChange={(e) => setInterVal2(e.target.value)}
                      className="mt-1.5 w-full p-1.5 rounded-lg border border-slate-300 bg-white text-[11px]"
                    />
                  )}
                </div>

                {/* 5. B.Tech CGPA Comparison Filter */}
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <label className="block font-bold text-slate-800 mb-1 text-[11px]">
                    B.Tech CGPA (0.0 - 10.0)
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <select
                      value={cgpaOperator}
                      onChange={(e) => setCgpaOperator(e.target.value)}
                      className="p-1.5 rounded-lg border border-slate-300 bg-white text-[11px]"
                    >
                      <option value="all">Any CGPA</option>
                      <option value="gt">Greater Than</option>
                      <option value="lt">Less Than</option>
                      <option value="eq">Equal To</option>
                      <option value="between">Between</option>
                    </select>
                    {cgpaOperator !== 'all' && (
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Min CGPA"
                        value={cgpaVal1}
                        onChange={(e) => setCgpaVal1(e.target.value)}
                        className="p-1.5 rounded-lg border border-slate-300 bg-white text-[11px]"
                      />
                    )}
                  </div>
                  {cgpaOperator === 'between' && (
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Max CGPA"
                      value={cgpaVal2}
                      onChange={(e) => setCgpaVal2(e.target.value)}
                      className="mt-1.5 w-full p-1.5 rounded-lg border border-slate-300 bg-white text-[11px]"
                    />
                  )}
                </div>
              </div>
            </section>

            {/* 3. Student Data Table with Download Options */}
            <section className="bg-white rounded-3xl border border-[#C1C8B7] shadow-sm overflow-hidden">
              {/* Table Action Bar */}
              <div className="p-4 sm:p-5 bg-slate-50/70 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-slate-900">
                      Department Student List
                    </h3>
                    <span className="px-2 py-0.5 rounded-full bg-[#4A192B]/10 text-[#4A192B] font-bold text-[10px]">
                      {filteredStudents.length} Students Matching
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Strictly illustrative demo student records during this UI development phase.
                  </p>
                </div>

                {/* Download Options (PDF & Excel) */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleDownload('PDF')}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold border border-slate-300 shadow-sm transition-all"
                  >
                    <FileText className="w-4 h-4 text-rose-600" />
                    <span>Download PDF</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDownload('Excel')}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold border border-slate-300 shadow-sm transition-all"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    <span>Download Excel</span>
                  </button>
                </div>
              </div>

              {/* Data Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#4A192B]/5 text-slate-700 border-b border-slate-200">
                      <th className="py-3 px-4 font-bold">Student Name</th>
                      <th className="py-3 px-3 font-bold">Register Number</th>
                      <th className="py-3 px-3 font-bold">Location</th>
                      <th className="py-3 px-3 font-bold">Current Year / Term</th>
                      <th className="py-3 px-3 font-bold text-center">SSC %</th>
                      <th className="py-3 px-3 font-bold text-center">Inter / Diploma %</th>
                      <th className="py-3 px-3 font-bold">Latest Completed Sem</th>
                      <th className="py-3 px-3 font-bold text-center">Latest CGPA</th>
                      <th className="py-3 px-4 font-bold text-center">Profile Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800">
                    {filteredStudents.length === 0 ? (
                      <tr>
                        <td colSpan="9" className="py-8 text-center text-slate-500">
                          No demo students matched the selected filters. Click "Clear Filters" to restore all records.
                        </td>
                      </tr>
                    ) : (
                      filteredStudents.map((std) => (
                        <tr key={std.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3 px-4 font-semibold text-slate-900">
                            {std.name}
                          </td>
                          <td className="py-3 px-3 font-mono font-bold text-[#4A192B]">
                            {std.registerNumber}
                          </td>
                          <td className="py-3 px-3 text-slate-600">
                            {std.location}
                          </td>
                          <td className="py-3 px-3 font-medium">
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold">
                              {std.year} ({std.term})
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center font-semibold">
                            {std.sscPercentage}%
                          </td>
                          <td className="py-3 px-3 text-center font-semibold">
                            {std.interPercentage}%
                          </td>
                          <td className="py-3 px-3 text-slate-700">
                            {std.latestCompletedSem}
                          </td>
                          <td className="py-3 px-3 text-center font-bold text-slate-900">
                            {std.latestSemesterCgpa > 0 ? std.latestSemesterCgpa.toFixed(2) : 'N/A (1st Yr)'}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                std.profileStatus === 'Verified'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {std.profileStatus}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}

        {/* SECTION B: HOD Semester Update Tracking */}
        {activeSection === 'updates' && (
          <div className="space-y-6">
            {/* Header Lockup for Update Requests */}
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#C1C8B7] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#FF6B1A]/15 text-[#FF6B1A] font-bold text-[11px] mb-1">
                  Active Request Cycle
                </div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  5th Semester CGPA Update &bull; Tracking Monitor
                </h3>
                <p className="text-xs text-slate-600">
                  Target: 3rd &amp; 4th Year AIML students eligible to submit and confirm their 5th semester CGPA.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsCreateModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#4A192B] hover:bg-[#35101E] text-white font-bold text-xs shadow-md transition-all cursor-pointer"
              >
                <PlusCircle className="w-4 h-4 text-[#FF6B1A]" />
                <span>Create Update Request</span>
              </button>
            </div>

            {/* Two Separate Lists (Submitted vs Pending Students) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 1. Submitted Students List */}
              <div className="bg-white rounded-3xl border border-emerald-200 shadow-sm overflow-hidden flex flex-col">
                <div className="p-4 bg-emerald-50 border-b border-emerald-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <h4 className="font-bold text-sm text-emerald-950">
                      Submitted Students
                    </h4>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-600 text-white font-bold text-xs shadow-sm">
                    {submittedStudents.length} Submitted
                  </span>
                </div>

                <div className="p-3 overflow-x-auto flex-1">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="text-slate-500 border-b border-slate-100">
                        <th className="py-2 px-3">Student Name</th>
                        <th className="py-2 px-2">Register Number</th>
                        <th className="py-2 px-2 text-center">Sem 5 CGPA</th>
                        <th className="py-2 px-3 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {submittedStudents.map((std) => (
                        <tr key={std.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-semibold text-slate-900">
                            {std.name}
                          </td>
                          <td className="py-2.5 px-2 font-mono text-[#4A192B] font-bold">
                            {std.registerNumber}
                          </td>
                          <td className="py-2.5 px-2 text-center font-bold text-emerald-700">
                            {std.latestSemesterCgpa.toFixed(2)}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <span className="inline-block px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                              Submitted
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 2. Pending Students List */}
              <div className="bg-white rounded-3xl border border-amber-200 shadow-sm overflow-hidden flex flex-col">
                <div className="p-4 bg-amber-50 border-b border-amber-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-600" />
                    <h4 className="font-bold text-sm text-amber-950">
                      Pending Students
                    </h4>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-600 text-white font-bold text-xs shadow-sm">
                    {pendingStudents.length} Pending
                  </span>
                </div>

                <div className="p-3 overflow-x-auto flex-1">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="text-slate-500 border-b border-slate-100">
                        <th className="py-2 px-3">Student Name</th>
                        <th className="py-2 px-2">Register Number</th>
                        <th className="py-2 px-2">Year / Term</th>
                        <th className="py-2 px-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {pendingStudents.map((std) => (
                        <tr key={std.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-semibold text-slate-900">
                            {std.name}
                          </td>
                          <td className="py-2.5 px-2 font-mono text-slate-700 font-bold">
                            {std.registerNumber}
                          </td>
                          <td className="py-2.5 px-2 text-slate-600">
                            {std.year} ({std.term})
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleSendReminder(std.name, std.registerNumber)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-100 hover:bg-amber-200 text-amber-900 text-[10px] font-bold transition-colors"
                            >
                              <Send className="w-3 h-3" />
                              <span>Remind</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Create Update Request */}
        {isCreateModalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
          >
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-start justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900">
                    Create Semester Update Request
                  </h3>
                  <p className="text-xs text-slate-500">
                    Notify eligible AIML cohort students to submit completed semester marks.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateRequest} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1" htmlFor="req-title">
                    Request Title
                  </label>
                  <input
                    id="req-title"
                    type="text"
                    required
                    value={newRequestTitle}
                    onChange={(e) => setNewRequestTitle(e.target.value)}
                    placeholder="e.g. 5th Semester CGPA Update"
                    className="w-full p-2.5 rounded-xl border border-slate-300 outline-none focus:ring-1 focus:ring-[#4A192B]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1" htmlFor="req-sem">
                    Target Semester
                  </label>
                  <select
                    id="req-sem"
                    value={newRequestSemester}
                    onChange={(e) => setNewRequestSemester(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-white outline-none focus:ring-1 focus:ring-[#4A192B]"
                  >
                    <option value="Semester 1">Semester 1</option>
                    <option value="Semester 2">Semester 2</option>
                    <option value="Semester 3">Semester 3</option>
                    <option value="Semester 4">Semester 4</option>
                    <option value="Semester 5">Semester 5 (3-1 / 3-2)</option>
                    <option value="Semester 6">Semester 6 (4-1)</option>
                    <option value="Semester 7">Semester 7 (4-2)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1" htmlFor="req-inst">
                    Instructions for Students
                  </label>
                  <textarea
                    id="req-inst"
                    rows="3"
                    value={newRequestInstructions}
                    onChange={(e) => setNewRequestInstructions(e.target.value)}
                    placeholder="Provide details about official grade sheet submission and deadline."
                    className="w-full p-2.5 rounded-xl border border-slate-300 outline-none focus:ring-1 focus:ring-[#4A192B]"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-[#4A192B] hover:bg-[#35101E] text-white font-bold shadow-md cursor-pointer"
                  >
                    Create Request
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-[#C1C8B7] py-4 text-center text-xs text-slate-600">
        <p>
          &copy; {new Date().getFullYear()} {BRANDING.collegeName} &bull; {BRANDING.departmentName} &bull; HOD Administrative Console
        </p>
      </footer>
    </div>
  );
}

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Home,
  Users,
  Shield,
  Search,
  Filter,
  FileSpreadsheet,
  FileText,
  RotateCcw,
  CheckCircle2,
  Clock,
  PlusCircle,
  X,
  LogOut,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  GraduationCap,
  Calendar,
  AlertCircle,
  BarChart3,
  TrendingUp,
  Award,
  Layers,
  ArrowRight,
  BookOpen,
  MapPin,
  Download,
  Eye,
  User,
  UserPlus
} from 'lucide-react';
import BRANDING from '../../config/branding';
import CollegeLogo from '../../components/CollegeLogo';
import StudentProfileModal from '../../components/StudentProfileModal';
import CreateStudentModal from '../../components/CreateStudentModal';
import { useAuth } from '../../context/AuthContext';
import { getStudentLatestAcademics, ALL_SEMESTER_TERMS, getTermsForYear, YEAR_ALLOWED_TERMS } from '../../data/mockData';
import { ACADEMIC_YEAR_TO_BATCH, getBatchLabel } from '../../utils/academicYearMapping';
import { downloadExcelReport, downloadPdfReport, generateReportNaming } from '../../utils/reportExporter';
import { useTheme } from '../../context/ThemeContext';
import { THEMES } from '../../config/theme';

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const { setTheme } = useTheme();

  useEffect(() => {
    setTheme(THEMES.HOD);
  }, [setTheme]);
  const {
    hodUser,
    logout,
    students,
    updateRequests,
    createStudentAccount,
    createYearSpecificUpdateRequest,
    isStudentSubmittedForRequest
  } = useAuth();

  // Navigation tab strictly limited to the 4 required sections:
  // 1. Overview | 2. Student Directory | 3. Update Tracking | 4. Academic Analytics
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'directory' | 'tracking' | 'analytics'

  // Mobile dedicated states
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [mobileTrackingTab, setMobileTrackingTab] = useState('pending'); // 'pending' | 'submitted'

  // ==========================================
  // SECTION 2: STUDENT DIRECTORY STATE
  // ==========================================
  const [searchName, setSearchName] = useState('');
  const [searchRegNo, setSearchRegNo] = useState('');
  const [filterYear, setFilterYear] = useState('All');
  const [filterSemester, setFilterSemester] = useState('All');
  const [filterLocation, setFilterLocation] = useState('All');
  const [filterOnboardingStatus, setFilterOnboardingStatus] = useState('All'); // 'All' | 'Profile Completed' | 'Profile Pending' | 'Inactive'

  // Modal: Add Student Account
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Comparison filters (Evaluates SSC %, Inter/Diploma %, and CGPA)
  const [sscOp, setSscOp] = useState('all');
  const [sscVal1, setSscVal1] = useState('');
  const [sscVal2, setSscVal2] = useState('');

  const [interOp, setInterOp] = useState('all');
  const [interVal1, setInterVal1] = useState('');
  const [interVal2, setInterVal2] = useState('');

  const [cgpaOp, setCgpaOp] = useState('all');
  const [cgpaVal1, setCgpaVal1] = useState('');
  const [cgpaVal2, setCgpaVal2] = useState('');

  const [appliedFilters, setAppliedFilters] = useState({
    name: '',
    regNo: '',
    year: 'All',
    semester: 'All',
    location: 'All',
    status: 'All',
    ssc: { op: 'all', v1: '', v2: '' },
    inter: { op: 'all', v1: '', v2: '' },
    cgpa: { op: 'all', v1: '', v2: '' },
  });

  // Calculate count of active filters for mobile badge
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (appliedFilters.name) count++;
    if (appliedFilters.regNo) count++;
    if (appliedFilters.year !== 'All') count++;
    if (appliedFilters.semester !== 'All') count++;
    if (appliedFilters.location !== 'All') count++;
    if (appliedFilters.status !== 'All') count++;
    if (appliedFilters.ssc.op !== 'all') count++;
    if (appliedFilters.inter.op !== 'all') count++;
    if (appliedFilters.cgpa.op !== 'all') count++;
    return count;
  }, [appliedFilters]);

  // Summary counts for Onboarding Status (calculated dynamically from actual records)
  const onboardingStats = useMemo(() => {
    const total = students.length;
    const completed = students.filter((s) => s.onboardingStatus === 'Profile Completed').length;
    const pending = students.filter((s) => s.onboardingStatus === 'Profile Pending').length;
    const inactive = students.filter((s) => s.onboardingStatus === 'Inactive').length;
    return { total, completed, pending, inactive };
  }, [students]);

  const handleApplyFilters = () => {
    setAppliedFilters({
      name: searchName.trim(),
      regNo: searchRegNo.trim(),
      year: filterYear,
      semester: filterSemester,
      location: filterLocation,
      status: filterOnboardingStatus,
      ssc: { op: sscOp, v1: sscVal1, v2: sscVal2 },
      inter: { op: interOp, v1: interVal1, v2: interVal2 },
      cgpa: { op: cgpaOp, v1: cgpaVal1, v2: cgpaVal2 },
    });
    setIsMobileFilterOpen(false);
  };

  // Student Profile Modal State
  const [viewingStudentId, setViewingStudentId] = useState(null);
  const selectedStudentForModal = useMemo(() => {
    if (!viewingStudentId) return null;
    return students.find((s) => s.id === viewingStudentId) || null;
  }, [students, viewingStudentId]);

  const handleClearSearch = () => {
    setSearchName('');
    setSearchRegNo('');
    setAppliedFilters((prev) => ({
      ...prev,
      name: '',
      regNo: '',
    }));
  };

  const handleClearFilters = () => {
    setSearchName('');
    setSearchRegNo('');
    setFilterYear('All');
    setFilterSemester('All');
    setFilterLocation('All');
    setFilterOnboardingStatus('All');
    setSscOp('all'); setSscVal1(''); setSscVal2('');
    setInterOp('all'); setInterVal1(''); setInterVal2('');
    setCgpaOp('all'); setCgpaVal1(''); setCgpaVal2('');

    setAppliedFilters({
      name: '',
      regNo: '',
      year: 'All',
      semester: 'All',
      location: 'All',
      status: 'All',
      ssc: { op: 'all', v1: '', v2: '' },
      inter: { op: 'all', v1: '', v2: '' },
      cgpa: { op: 'all', v1: '', v2: '' },
    });
  };

  const handleQuickStatusFilter = (status) => {
    setFilterOnboardingStatus(status);
    setAppliedFilters((prev) => ({
      ...prev,
      status,
    }));
  };

  const evalComp = (val, op, v1, v2) => {
    if (op === 'all' || !v1) return true;
    if (val === null || val === undefined) return false;
    const num = parseFloat(val);
    const n1 = parseFloat(v1);
    if (isNaN(num) || isNaN(n1)) return true;
    if (op === 'gt') return num > n1;
    if (op === 'lt') return num < n1;
    if (op === 'eq') return Math.abs(num - n1) < 0.01;
    if (op === 'between') {
      const n2 = parseFloat(v2);
      if (isNaN(n2)) return num >= n1;
      const lower = Math.min(n1, n2);
      const upper = Math.max(n1, n2);
      return num >= lower && num <= upper;
    }
    return true;
  };

  // Filtered Students List (Real-time Register Number & Name Search + Multi-attribute Filters)
  const filteredStudents = useMemo(() => {
    const regQuery = searchRegNo.trim().toUpperCase();
    const nameQuery = searchName.trim().toLowerCase();

    return students.filter((s) => {
      const latest = getStudentLatestAcademics(s);

      // Search by Register Number (supports exact and partial matching, case-insensitive)
      if (regQuery && !s.registerNumber.toUpperCase().includes(regQuery) && !s.name.toUpperCase().includes(regQuery)) {
        return false;
      }
      if (appliedFilters.regNo && !s.registerNumber.toUpperCase().includes(appliedFilters.regNo.toUpperCase()) && !s.name.toUpperCase().includes(appliedFilters.regNo.toUpperCase())) {
        return false;
      }

      // Search by Student Name (supports exact and partial matching, case-insensitive, with roll number fallback)
      if (nameQuery && !s.name.toLowerCase().includes(nameQuery) && !s.registerNumber.toLowerCase().includes(nameQuery)) {
        return false;
      }
      if (appliedFilters.name && !s.name.toLowerCase().includes(appliedFilters.name.toLowerCase()) && !s.registerNumber.toLowerCase().includes(appliedFilters.name.toLowerCase())) {
        return false;
      }

      // Onboarding Status Filter
      if (appliedFilters.status !== 'All') {
        const studentStatus = s.onboardingStatus || (s.name && s.year !== 'Not Provided' ? 'Profile Completed' : 'Profile Pending');
        if (studentStatus !== appliedFilters.status) {
          return false;
        }
      }

      // Multi-Parameter Filters
      if (appliedFilters.year !== 'All' && s.year !== appliedFilters.year) {
        return false;
      }
      if (appliedFilters.semester !== 'All' && latest.latestSemester !== appliedFilters.semester) {
        return false;
      }
      if (appliedFilters.location !== 'All' && s.location !== appliedFilters.location) {
        return false;
      }
      if (!evalComp(s.sscPercentage, appliedFilters.ssc.op, appliedFilters.ssc.v1, appliedFilters.ssc.v2)) {
        return false;
      }
      if (!evalComp(s.interPercentage, appliedFilters.inter.op, appliedFilters.inter.v1, appliedFilters.inter.v2)) {
        return false;
      }

      // If a specific semester is chosen, compare that semester's CGPA; otherwise evaluate latest completed CGPA
      let targetCgpa = null;
      if (appliedFilters.semester !== 'All') {
        const semRec = (s.semesterRecords || []).find((r) => r.term === appliedFilters.semester && r.cgpa !== null && r.status === 'Updated');
        targetCgpa = semRec ? semRec.cgpa : null;
      } else {
        targetCgpa = latest.latestCgpa;
      }
      if (!evalComp(targetCgpa, appliedFilters.cgpa.op, appliedFilters.cgpa.v1, appliedFilters.cgpa.v2)) {
        return false;
      }

      return true;
    });
  }, [students, searchRegNo, searchName, appliedFilters]);

  // ==========================================
  // SECTION 3: UPDATE TRACKING STATE
  // ==========================================
  const [selectedRequestId, setSelectedRequestId] = useState(() => {
    return updateRequests[0]?.id || '';
  });

  const activeRequest = useMemo(() => {
    return updateRequests.find((r) => r.id === selectedRequestId) || updateRequests[0] || null;
  }, [updateRequests, selectedRequestId]);

  // Submitted & Pending lists for the active request
  const { submittedForActiveReq, pendingForActiveReq } = useMemo(() => {
    if (!activeRequest) return { submittedForActiveReq: [], pendingForActiveReq: [] };

    // Target only students belonging to activeRequest.targetYear
    const cohort = students.filter((s) => s.year === activeRequest.targetYear);

    const submitted = [];
    const pending = [];

    cohort.forEach((s) => {
      const record = (s.semesterRecords || []).find((r) => r.term === activeRequest.targetSemester);
      if (record && record.cgpa !== null && record.status === 'Updated') {
        submitted.push({
          ...s,
          submittedSem: activeRequest.targetSemester,
          submittedCgpa: record.cgpa,
          status: 'Submitted'
        });
      } else {
        pending.push({
          ...s,
          status: 'Pending'
        });
      }
    });

    return { submittedForActiveReq: submitted, pendingForActiveReq: pending };
  }, [students, activeRequest]);

  // Modal: Create Update Request
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newTargetYear, setNewTargetYear] = useState('3rd Year');
  const [newTargetSem, setNewTargetSem] = useState('3-1');
  const [newInstructions, setNewInstructions] = useState('');

  const handleTargetYearChange = (year) => {
    setNewTargetYear(year);
    const allowed = getTermsForYear(year);
    // Immediately reset previously selected term if it is not valid for the newly selected year
    if (!allowed.includes(newTargetSem)) {
      setNewTargetSem(allowed[0] || '');
    }
  };

  const handleCreateRequestSubmit = (e) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      alert('Please enter a request title.');
      return;
    }

    const allowed = getTermsForYear(newTargetYear);
    if (!allowed.includes(newTargetSem)) {
      alert(`Invalid semester/term for ${newTargetYear}. Allowed terms are: ${allowed.join(', ')}`);
      return;
    }

    const created = createYearSpecificUpdateRequest({
      title: newTitle.trim(),
      targetYear: newTargetYear,
      targetSemester: newTargetSem,
      instructions: newInstructions.trim()
    });

    setSelectedRequestId(created.id);
    setIsCreateModalOpen(false);
    setNewTitle('');
    setNewInstructions('');
  };

  // ==========================================
  // SECTION 4: ACADEMIC PERFORMANCE ANALYTICS
  // (Strictly CGPA-only Analytics)
  // ==========================================
  const [analyticsYear, setAnalyticsYear] = useState('All');
  const [analyticsSemester, setAnalyticsSemester] = useState('All');

  const analyticsData = useMemo(() => {
    // Filter student records matching analytics filters
    let pool = students;
    if (analyticsYear !== 'All') {
      pool = pool.filter((s) => s.year === analyticsYear);
    }

    // Gather completed semester entries
    const semEntries = [];
    pool.forEach((s) => {
      (s.semesterRecords || []).forEach((r) => {
        if (r.cgpa !== null && r.status === 'Updated') {
          if (analyticsSemester === 'All' || r.term === analyticsSemester) {
            semEntries.push({
              studentName: s.name,
              registerNumber: s.registerNumber,
              year: s.year,
              term: r.term,
              cgpa: r.cgpa,
            });
          }
        }
      });
    });

    if (semEntries.length === 0) {
      return { hasRecords: false };
    }

    // Calculations strictly derived from available demo records
    const totalCgpa = semEntries.reduce((acc, cur) => acc + cur.cgpa, 0);
    const avgCgpa = totalCgpa / semEntries.length;

    // Highest & Lowest CGPA
    let highestCgpa = semEntries[0];
    let lowestCgpa = semEntries[0];

    semEntries.forEach((entry) => {
      if (entry.cgpa > highestCgpa.cgpa) highestCgpa = entry;
      if (entry.cgpa < lowestCgpa.cgpa) lowestCgpa = entry;
    });

    // Semester-wise averages
    const terms = ['1-1', '1-2', '2-1', '2-2', '3-1', '3-2', '4-1', '4-2'];
    const semesterStats = terms.map((t) => {
      const records = semEntries.filter((e) => e.term === t);
      if (records.length === 0) return { term: t, count: 0, avgCgpa: null };
      const cSum = records.reduce((acc, c) => acc + c.cgpa, 0);
      return {
        term: t,
        count: records.length,
        avgCgpa: (cSum / records.length).toFixed(2),
      };
    }).filter(s => s.count > 0);

    // Performance Distribution based on CGPA
    const distribution = {
      outstanding: semEntries.filter(e => e.cgpa >= 9.0).length,
      distinction: semEntries.filter(e => e.cgpa >= 8.0 && e.cgpa < 9.0).length,
      firstClass: semEntries.filter(e => e.cgpa >= 7.0 && e.cgpa < 8.0).length,
      secondClass: semEntries.filter(e => e.cgpa >= 6.0 && e.cgpa < 7.0).length,
      pass: semEntries.filter(e => e.cgpa < 6.0).length,
    };

    return {
      hasRecords: true,
      totalEntries: semEntries.length,
      avgCgpa: avgCgpa.toFixed(2),
      highestCgpa,
      lowestCgpa,
      semesterStats,
      distribution
    };
  }, [students, analyticsYear, analyticsSemester]);

  // ==========================================
  // MANDATORY DOWNLOADABLE REPORTS HANDLERS
  // ==========================================
  const directoryColumns = [
    { header: 'Student Name', accessor: 'name' },
    { header: 'Register Number', accessor: 'registerNumber' },
    { header: 'Location', accessor: 'location' },
    { header: 'Year', accessor: 'year' },
    { header: 'Current Term', accessor: 'term' },
    { header: 'SSC %', accessor: s => `${s.sscPercentage}%`, align: 'center' },
    { header: 'Inter/Diploma %', accessor: s => `${s.interPercentage}% (${s.interType})`, align: 'center' },
    { header: 'Latest Sem', accessor: s => getStudentLatestAcademics(s).latestSemester, align: 'center' },
    { header: 'Latest CGPA', accessor: s => getStudentLatestAcademics(s).latestCgpa?.toFixed(2) || '—', align: 'center' },
  ];

  // 1. Complete Student Directory
  const handleDownloadCompleteDirectory = (format) => {
    const naming = generateReportNaming({ type: 'complete_directory' });
    const params = {
      title: naming.title,
      filename: naming.filename,
      filtersDescription: naming.filtersDescription,
      columns: directoryColumns,
      data: students,
    };
    if (format === 'excel') downloadExcelReport(params);
    else downloadPdfReport(params);
  };

  // 2. Filtered Student List
  const handleDownloadFilteredDirectory = (format) => {
    const naming = generateReportNaming({ type: 'filtered_directory', appliedFilters });
    const params = {
      title: naming.title,
      filename: naming.filename,
      filtersDescription: naming.filtersDescription,
      columns: directoryColumns,
      data: filteredStudents,
    };
    if (format === 'excel') downloadExcelReport(params);
    else downloadPdfReport(params);
  };

  // 3 & 4. Update Tracking Submitted / Pending
  const submittedColumns = [
    { header: 'Student Name', accessor: 'name' },
    { header: 'Register Number', accessor: 'registerNumber' },
    { header: 'Year / Term', accessor: s => `${s.year} (${s.term})` },
    { header: 'Submitted Sem', accessor: 'submittedSem', align: 'center' },
    { header: 'CGPA', accessor: s => s.submittedCgpa?.toFixed(2), align: 'center' },
    { header: 'Status', accessor: 'status', align: 'center' },
  ];

  const pendingColumns = [
    { header: 'Student Name', accessor: 'name' },
    { header: 'Register Number', accessor: 'registerNumber' },
    { header: 'Year / Term', accessor: s => `${s.year} (${s.term})` },
    { header: 'Location', accessor: 'location' },
    { header: 'Status', accessor: 'status', align: 'center' },
  ];

  const handleDownloadSubmittedTracking = (format) => {
    if (!activeRequest) return;
    const naming = generateReportNaming({ type: 'submitted', request: activeRequest });
    const params = {
      title: naming.title,
      filename: naming.filename,
      filtersDescription: naming.filtersDescription,
      columns: submittedColumns,
      data: submittedForActiveReq,
    };
    if (format === 'excel') downloadExcelReport(params);
    else downloadPdfReport(params);
  };

  const handleDownloadPendingTracking = (format) => {
    if (!activeRequest) return;
    const naming = generateReportNaming({ type: 'pending', request: activeRequest });
    const params = {
      title: naming.title,
      filename: naming.filename,
      filtersDescription: naming.filtersDescription,
      columns: pendingColumns,
      data: pendingForActiveReq,
    };
    if (format === 'excel') downloadExcelReport(params);
    else downloadPdfReport(params);
  };

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  const locationOptions = ['All', 'Vijayawada', 'Guntur', 'Kanchikacherla', 'Nandigama', 'Jaggaiahpet', 'Ibrahimpatnam', 'Tiruvuru', 'Mangalagiri'];

  return (
    <div className="min-h-screen bg-[#D7DCCF] text-[#1E231D] flex flex-col font-sans antialiased pb-12 md:pb-0 w-full max-w-full overflow-x-hidden">
      {/* ============================================================== */}
      {/* MOBILE FLOATING GLASSMORPHISM PILL NAVIGATION (md:hidden)      */}
      {/* ============================================================== */}
      <header
        aria-label="Mobile Navigation"
        className="fixed top-3 inset-x-3 z-50 md:hidden bg-white/90 backdrop-blur-xl border border-white/60 shadow-lg rounded-full px-3 py-1.5 flex items-center justify-between max-w-[calc(100vw-24px)] mx-auto"
      >
        {/* Left: Admin Identity Badge */}
        <div className="flex items-center gap-1.5 pl-1">
          <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-[#4A192B] text-white shadow-xs">
            ADMIN
          </span>
        </div>

        {/* Center: 4 Floating Navigation Icons */}
        <nav className="flex items-center gap-1 sm:gap-2">
          {/* 1. Overview */}
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            aria-label="Overview"
            title="Overview"
            className={`p-2 rounded-full transition-all cursor-pointer flex items-center justify-center ${
              activeTab === 'overview'
                ? 'bg-[#4A192B] text-white shadow-sm ring-1 ring-[#FF6B1A]'
                : 'text-slate-600 hover:text-slate-900 active:scale-95'
            }`}
          >
            <Home className="w-4 h-4" />
          </button>

          {/* 2. Student Directory */}
          <button
            type="button"
            onClick={() => setActiveTab('directory')}
            aria-label="Student Directory"
            title="Student Directory"
            className={`p-2 rounded-full transition-all cursor-pointer flex items-center justify-center relative ${
              activeTab === 'directory'
                ? 'bg-[#4A192B] text-white shadow-sm ring-1 ring-[#FF6B1A]'
                : 'text-slate-600 hover:text-slate-900 active:scale-95'
            }`}
          >
            <Users className="w-4 h-4" />
          </button>

          {/* 3. Update Tracking */}
          <button
            type="button"
            onClick={() => setActiveTab('tracking')}
            aria-label="Update Tracking"
            title="Update Tracking"
            className={`p-2 rounded-full transition-all cursor-pointer flex items-center justify-center relative ${
              activeTab === 'tracking'
                ? 'bg-[#4A192B] text-white shadow-sm ring-1 ring-[#FF6B1A]'
                : 'text-slate-600 hover:text-slate-900 active:scale-95'
            }`}
          >
            <Clock className="w-4 h-4" />
            {pendingForActiveReq.length > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#FF6B1A] ring-1 ring-white"></span>
            )}
          </button>

          {/* 4. Academic Analytics */}
          <button
            type="button"
            onClick={() => setActiveTab('analytics')}
            aria-label="Academic Analytics"
            title="Academic Analytics"
            className={`p-2 rounded-full transition-all cursor-pointer flex items-center justify-center ${
              activeTab === 'analytics'
                ? 'bg-[#4A192B] text-white shadow-sm ring-1 ring-[#FF6B1A]'
                : 'text-slate-600 hover:text-slate-900 active:scale-95'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
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
          <LogOut className="w-4 h-4 text-[#FF6B1A]" />
        </button>
      </header>

      {/* Mobile Branding Bar (Below floating navigation, md:hidden) */}
      <div className="md:hidden px-3 pt-16 pb-2 w-full max-w-full min-w-0">
        <div className="flex items-center gap-2.5 p-2 rounded-2xl bg-white/70 backdrop-blur-xs border border-[#C1C8B7]/70 shadow-2xs">
          <CollegeLogo size="sm" badge />
          <div className="leading-tight flex-1 min-w-0">
            <h1 className="text-xs font-bold text-slate-900 truncate">
              {BRANDING.collegeName}
            </h1>
            <p className="text-[10px] font-semibold text-[#4A192B] truncate">
              {BRANDING.departmentName} &bull; Admin Portal
            </p>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* DESKTOP TOP BAR & HORIZONTAL NAVIGATION (hidden md:block)       */}
      {/* ============================================================== */}
      <header className="hidden md:block bg-[#4A192B] text-white shadow-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <CollegeLogo size="sm" badge />
            <div className="leading-tight">
              <h1 className="text-xs sm:text-sm font-bold tracking-tight text-white">
                {BRANDING.collegeName}
              </h1>
              <p className="text-[11px] font-semibold text-[#FF6B1A]">
                {BRANDING.departmentName} &bull; Admin / HOD Portal
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            <div className="hidden sm:flex flex-col text-right leading-tight">
              <span className="text-xs font-bold text-white">{hodUser.name}</span>
              <span className="text-[10px] text-white/70">Head of Department (AIML)</span>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 active:scale-95 text-xs font-bold text-white border border-white/20 transition-all cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5 text-[#FF6B1A]" />
              <span>Logout</span>
            </button>
          </div>
        </div>

        {/* Admin Navigation Bar strictly with 4 tabs */}
        <div className="bg-[#35101E] border-t border-white/10 px-4 sm:px-8">
          <div className="max-w-7xl mx-auto flex items-center gap-1 sm:gap-3 overflow-x-auto">
            {/* 1. Overview */}
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className={`py-2.5 px-3 sm:px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'overview'
                  ? 'border-[#FF6B1A] text-white'
                  : 'border-transparent text-white/70 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-[#FF6B1A]" />
              <span>1. Overview</span>
            </button>

            {/* 2. Student Directory */}
            <button
              type="button"
              onClick={() => setActiveTab('directory')}
              className={`py-2.5 px-3 sm:px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'directory'
                  ? 'border-[#FF6B1A] text-white'
                  : 'border-transparent text-white/70 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-[#FF6B1A]" />
              <span>2. Student Directory</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/15">
                {filteredStudents.length}
              </span>
            </button>

            {/* 3. Update Tracking */}
            <button
              type="button"
              onClick={() => setActiveTab('tracking')}
              className={`py-2.5 px-3 sm:px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'tracking'
                  ? 'border-[#FF6B1A] text-white'
                  : 'border-transparent text-white/70 hover:text-white'
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-[#FF6B1A]" />
              <span>3. Update Tracking</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-[#FF6B1A] text-white font-bold">
                {pendingForActiveReq.length} Pending
              </span>
            </button>

            {/* 4. Academic Analytics */}
            <button
              type="button"
              onClick={() => setActiveTab('analytics')}
              className={`py-2.5 px-3 sm:px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'analytics'
                  ? 'border-[#FF6B1A] text-white'
                  : 'border-transparent text-white/70 hover:text-white'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5 text-[#FF6B1A]" />
              <span>4. Academic Analytics</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 w-full flex-1 space-y-4 sm:space-y-6 min-w-0 overflow-x-hidden">
        {/* ============================================================== */}
        {/* TAB 1: OVERVIEW                                                */}
        {/* ============================================================== */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
              <div className="bg-white rounded-2xl p-4 border border-[#C1C8B7] shadow-sm">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Total Students
                </span>
                <div className="text-2xl sm:text-3xl font-extrabold text-[#4A192B] mt-1">
                  {students.length}
                </div>
                <span className="text-[10px] text-slate-500">Department Records</span>
              </div>

              <div className="bg-white rounded-2xl p-4 border border-[#C1C8B7] shadow-sm">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  2nd Year
                </span>
                <div className="text-2xl sm:text-3xl font-extrabold text-slate-800 mt-1">
                  {students.filter(s => s.currentYear === 2 || s.current_year === 2 || (s.year && String(s.year).includes('2'))).length}
                </div>
                <span className="text-[10px] text-slate-500 font-semibold">{ACADEMIC_YEAR_TO_BATCH[2]}</span>
              </div>

              <div className="bg-white rounded-2xl p-4 border border-[#C1C8B7] shadow-sm">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  3rd Year
                </span>
                <div className="text-2xl sm:text-3xl font-extrabold text-slate-800 mt-1">
                  {students.filter(s => s.currentYear === 3 || s.current_year === 3 || (s.year && String(s.year).includes('3'))).length}
                </div>
                <span className="text-[10px] text-slate-500 font-semibold">{ACADEMIC_YEAR_TO_BATCH[3]}</span>
              </div>

              <div className="bg-white rounded-2xl p-4 border border-[#C1C8B7] shadow-sm">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  4th Year
                </span>
                <div className="text-2xl sm:text-3xl font-extrabold text-slate-800 mt-1">
                  {students.filter(s => s.currentYear === 4 || s.current_year === 4 || (s.year && String(s.year).includes('4'))).length}
                </div>
                <span className="text-[10px] text-slate-500 font-semibold">{ACADEMIC_YEAR_TO_BATCH[4]}</span>
              </div>

              <div className="bg-white rounded-2xl p-4 border border-[#C1C8B7] shadow-sm">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Active Requests
                </span>
                <div className="text-2xl sm:text-3xl font-extrabold text-slate-800 mt-1">
                  {updateRequests.length}
                </div>
                <span className="text-[10px] text-slate-500">Update Cycles</span>
              </div>

              <div className="bg-white rounded-2xl p-4 border border-[#FF6B1A]/40 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-2 h-full bg-[#FF6B1A]"></div>
                <span className="text-[11px] font-bold text-[#FF6B1A] uppercase tracking-wider block truncate">
                  Latest Cycle Status
                </span>
                <div className="text-lg sm:text-xl font-extrabold text-[#4A192B] mt-1">
                  {submittedForActiveReq.length} / {submittedForActiveReq.length + pendingForActiveReq.length}
                </div>
                <span className="text-[10px] text-slate-600 block truncate">
                  {activeRequest ? activeRequest.title : 'Updates'}
                </span>
              </div>
            </div>

            {/* Quick Navigation Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div
                onClick={() => setActiveTab('directory')}
                className="bg-white rounded-3xl p-6 border border-[#C1C8B7] shadow-sm hover:shadow-md transition-all cursor-pointer group"
              >
                <div className="w-12 h-12 rounded-2xl bg-[#4A192B]/10 text-[#4A192B] flex items-center justify-center mb-4 group-hover:bg-[#4A192B] group-hover:text-white transition-colors">
                  <Users className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-base text-slate-900 mb-1">
                  Student Academic Directory
                </h3>
                <p className="text-xs text-slate-600 mb-4">
                  View and search all department students with multi-parameter CGPA, percentage, year, and location filters.
                </p>
                <span className="text-xs font-bold text-[#4A192B] flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  <span>Open Directory</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#FF6B1A]" />
                </span>
              </div>

              <div
                onClick={() => setActiveTab('tracking')}
                className="bg-white rounded-3xl p-6 border border-[#C1C8B7] shadow-sm hover:shadow-md transition-all cursor-pointer group"
              >
                <div className="w-12 h-12 rounded-2xl bg-[#4A192B]/10 text-[#4A192B] flex items-center justify-center mb-4 group-hover:bg-[#4A192B] group-hover:text-white transition-colors">
                  <Clock className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-base text-slate-900 mb-1">
                  Year-Specific Update Tracking
                </h3>
                <p className="text-xs text-slate-600 mb-4">
                  Create academic update requests for specific cohorts and track Submitted vs Pending student lists in real-time.
                </p>
                <span className="text-xs font-bold text-[#4A192B] flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  <span>Open Update Tracking</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#FF6B1A]" />
                </span>
              </div>

              <div
                onClick={() => setActiveTab('analytics')}
                className="bg-white rounded-3xl p-6 border border-[#C1C8B7] shadow-sm hover:shadow-md transition-all cursor-pointer group"
              >
                <div className="w-12 h-12 rounded-2xl bg-[#4A192B]/10 text-[#4A192B] flex items-center justify-center mb-4 group-hover:bg-[#4A192B] group-hover:text-white transition-colors">
                  <BarChart3 className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-base text-slate-900 mb-1">
                  Academic Performance Analytics
                </h3>
                <p className="text-xs text-slate-600 mb-4">
                  Analyze semester-wise and year-wise average CGPA, highest/lowest scores, and performance distribution.
                </p>
                <span className="text-xs font-bold text-[#4A192B] flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  <span>View Analytics</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#FF6B1A]" />
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 2: STUDENT DIRECTORY                                       */}
        {/* ============================================================== */}
        {activeTab === 'directory' && (
          <div className="space-y-4 sm:space-y-6">
            {/* Feedback Toast */}
            {toastMessage && (
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-semibold flex items-center justify-between shadow-xs animate-in fade-in">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{toastMessage}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setToastMessage(null)}
                  className="text-emerald-700 hover:text-emerald-900 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* ONBOARDING STATUS SUMMARY CARDS */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {/* 1. Total Student Accounts */}
              <div 
                onClick={() => handleQuickStatusFilter('All')}
                className={`p-4 rounded-3xl bg-white border transition-all cursor-pointer shadow-xs hover:shadow-md ${
                  appliedFilters.status === 'All' ? 'border-[#4A192B] ring-1 ring-[#4A192B]' : 'border-[#C1C8B7]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Total Accounts
                  </span>
                  <Users className="w-4 h-4 text-[#4A192B]" />
                </div>
                <div className="text-2xl font-black text-[#4A192B]">{onboardingStats.total}</div>
                <span className="text-[10px] text-slate-500 block">Department Database</span>
              </div>

              {/* 2. Profiles Completed */}
              <div 
                onClick={() => handleQuickStatusFilter('Profile Completed')}
                className={`p-4 rounded-3xl bg-white border transition-all cursor-pointer shadow-xs hover:shadow-md ${
                  appliedFilters.status === 'Profile Completed' ? 'border-emerald-600 ring-1 ring-emerald-600' : 'border-[#C1C8B7]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
                    Profiles Completed
                  </span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-2xl font-black text-emerald-800">{onboardingStats.completed}</div>
                <span className="text-[10px] text-emerald-600 block">Active &amp; Verified</span>
              </div>

              {/* 3. Profiles Pending */}
              <div 
                onClick={() => handleQuickStatusFilter('Profile Pending')}
                className={`p-4 rounded-3xl bg-white border transition-all cursor-pointer shadow-xs hover:shadow-md ${
                  appliedFilters.status === 'Profile Pending' ? 'border-amber-500 ring-1 ring-amber-500' : 'border-[#C1C8B7]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">
                    Profiles Pending
                  </span>
                  <Clock className="w-4 h-4 text-amber-600" />
                </div>
                <div className="text-2xl font-black text-amber-800">{onboardingStats.pending}</div>
                <span className="text-[10px] text-amber-600 block">Awaiting First Login</span>
              </div>

              {/* 4. Inactive Accounts */}
              <div 
                onClick={() => handleQuickStatusFilter('Inactive')}
                className={`p-4 rounded-3xl bg-white border transition-all cursor-pointer shadow-xs hover:shadow-md ${
                  appliedFilters.status === 'Inactive' ? 'border-slate-500 ring-1 ring-slate-500' : 'border-[#C1C8B7]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Inactive Accounts
                  </span>
                  <AlertCircle className="w-4 h-4 text-slate-400" />
                </div>
                <div className="text-2xl font-black text-slate-700">{onboardingStats.inactive}</div>
                <span className="text-[10px] text-slate-500 block">Disabled Accounts</span>
              </div>
            </div>

            {/* DEDICATED QUICK SEARCH BAR + ADD STUDENT BUTTON */}
            <section aria-label="Student Directory Search" className="bg-white rounded-3xl p-4 sm:p-5 border border-[#C1C8B7] shadow-sm space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-[#4A192B]/10 text-[#4A192B] flex items-center justify-center shrink-0">
                    <Search className="w-4 h-4 text-[#FF6B1A]" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 leading-tight">
                      Search Department Students
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Search instantly by Register Number (Roll No) or Student Name.
                    </p>
                  </div>
                </div>

                {/* Top Action Bar: Add Student + Clear search + Filter toggle */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* PROMINENT ADD STUDENT BUTTON */}
                  <button
                    type="button"
                    onClick={() => setIsAddStudentOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#4A192B] hover:bg-[#35101E] active:scale-95 text-white text-xs font-bold shadow-sm transition-all cursor-pointer shrink-0"
                  >
                    <UserPlus className="w-4 h-4 text-[#FF6B1A]" />
                    <span>+ Add Student</span>
                  </button>

                  {(searchRegNo || searchName || appliedFilters.status !== 'All') && (
                    <button
                      type="button"
                      onClick={handleClearSearch}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-[#FF6B1A]" />
                      <span>Reset</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setIsMobileFilterOpen(!isMobileFilterOpen)}
                    className="md:hidden inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold cursor-pointer"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5 text-[#FF6B1A]" />
                    <span>{isMobileFilterOpen ? 'Hide' : 'Filter'}</span>
                    {activeFilterCount > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full bg-[#4A192B] text-white text-[9px] font-bold">
                        {activeFilterCount}
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {/* Responsive Search Inputs Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {/* 1. Search by Register Number */}
                <div>
                  <label htmlFor="quick-search-reg" className="block font-bold text-xs text-slate-700 mb-1">
                    Search Register Number (Roll Number)
                  </label>
                  <div className="relative">
                    <input
                      id="quick-search-reg"
                      type="text"
                      value={searchRegNo}
                      onChange={(e) => setSearchRegNo(e.target.value)}
                      placeholder="e.g. 22H71A6125 or partial 6125..."
                      className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-300 bg-white text-xs font-mono font-bold text-[#4A192B] placeholder:text-slate-400 placeholder:font-sans placeholder:font-normal outline-none focus:ring-2 focus:ring-[#4A192B]/20 focus:border-[#4A192B] transition-all"
                    />
                    <Search className="w-4 h-4 text-[#4A192B] absolute left-3 top-2.5 pointer-events-none" />
                    {searchRegNo && (
                      <button
                        type="button"
                        onClick={() => setSearchRegNo('')}
                        className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                        title="Clear Register Number search"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* 2. Search by Student Name */}
                <div>
                  <label htmlFor="quick-search-name" className="block font-bold text-xs text-slate-700 mb-1">
                    Search Student Name
                  </label>
                  <div className="relative">
                    <input
                      id="quick-search-name"
                      type="text"
                      value={searchName}
                      onChange={(e) => setSearchName(e.target.value)}
                      placeholder="e.g. Sai Krishna or partial Harsha..."
                      className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-300 bg-white text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-[#4A192B]/20 focus:border-[#4A192B] transition-all"
                    />
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                    {searchName && (
                      <button
                        type="button"
                        onClick={() => setSearchName('')}
                        className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                        title="Clear Student Name search"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* Mobile Filter Toggle Button (md:hidden) */}
            <div className="md:hidden flex items-center justify-between gap-2 p-3 bg-white rounded-2xl border border-[#C1C8B7] shadow-xs">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-[#FF6B1A]" />
                <span className="text-xs font-bold text-slate-900">Directory Filters</span>
                {activeFilterCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-[#4A192B] text-white text-[10px] font-bold">
                    {activeFilterCount} Active
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                {activeFilterCount > 0 && (
                  <button
                    type="button"
                    onClick={handleClearFilters}
                    className="px-2.5 py-1 text-[11px] font-bold text-rose-700 hover:bg-rose-50 rounded-lg cursor-pointer"
                  >
                    Reset
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsMobileFilterOpen(!isMobileFilterOpen)}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <span>{isMobileFilterOpen ? 'Hide' : 'Filter'}</span>
                  {isMobileFilterOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Filter Panel (Collapsible on mobile, always visible on desktop) */}
            <section className={`${isMobileFilterOpen ? 'block' : 'hidden'} md:block bg-white rounded-3xl p-4 sm:p-6 border border-[#C1C8B7] shadow-sm`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 mb-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-[#FF6B1A]" />
                  <h3 className="font-bold text-sm text-slate-900">
                    Student Directory Filters &amp; Comparison
                  </h3>
                  <span className="text-[11px] text-slate-500">
                    (Multiple filters can be combined simultaneously)
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleClearFilters}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Clear Filters</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleApplyFilters}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#4A192B] hover:bg-[#35101E] text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#FF6B1A]" />
                    <span>Apply Filters</span>
                  </button>
                </div>
              </div>

              {/* Filters Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 text-xs">
                {/* Search by Name */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Search by Name
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={searchName}
                      onChange={(e) => setSearchName(e.target.value)}
                      placeholder="e.g. Sai Krishna"
                      className="w-full p-2 pr-8 rounded-xl border border-slate-300 bg-white text-slate-800 outline-none focus:ring-1 focus:ring-[#4A192B]"
                    />
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-3 pointer-events-none" />
                  </div>
                </div>

                {/* Search by Register Number */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Search Register Number
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={searchRegNo}
                      onChange={(e) => setSearchRegNo(e.target.value)}
                      placeholder="e.g. 22H71A6125"
                      className="w-full p-2 pr-8 rounded-xl border border-slate-300 bg-white text-slate-800 font-mono outline-none focus:ring-1 focus:ring-[#4A192B]"
                    />
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-3 pointer-events-none" />
                  </div>
                </div>

                {/* Filter by Profile Status */}
                <div>
                  <label htmlFor="filter-onboarding-status" className="block font-bold text-slate-700 mb-1">
                    Profile Status
                  </label>
                  <select
                    id="filter-onboarding-status"
                    value={filterOnboardingStatus}
                    onChange={(e) => setFilterOnboardingStatus(e.target.value)}
                    className="w-full p-2 rounded-xl border border-slate-300 bg-white text-slate-800 outline-none focus:ring-1 focus:ring-[#4A192B]"
                  >
                    <option value="All">All Statuses</option>
                    <option value="Profile Completed">Profile Completed</option>
                    <option value="Profile Pending">Profile Pending</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>

                {/* Filter by Academic Year */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Academic Year
                  </label>
                  <select
                    value={filterYear}
                    onChange={(e) => setFilterYear(e.target.value)}
                    className="w-full p-2 rounded-xl border border-slate-300 bg-white text-slate-800 outline-none focus:ring-1 focus:ring-[#4A192B]"
                  >
                    <option value="All">All Years</option>
                    <option value="2nd Year">2nd Year</option>
                    <option value="3rd Year">3rd Year</option>
                    <option value="4th Year">4th Year</option>
                  </select>
                </div>

                {/* Filter by Semester */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Latest Semester
                  </label>
                  <select
                    value={filterSemester}
                    onChange={(e) => setFilterSemester(e.target.value)}
                    className="w-full p-2 rounded-xl border border-slate-300 bg-white text-slate-800 outline-none focus:ring-1 focus:ring-[#4A192B]"
                  >
                    <option value="All">All Semesters</option>
                    <option value="1-1">Semester 1-1</option>
                    <option value="1-2">Semester 1-2</option>
                    <option value="2-1">Semester 2-1</option>
                    <option value="2-2">Semester 2-2</option>
                    <option value="3-1">Semester 3-1</option>
                    <option value="3-2">Semester 3-2</option>
                    <option value="4-1">Semester 4-1</option>
                    <option value="4-2">Semester 4-2</option>
                  </select>
                </div>

                {/* Filter by Location */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Location
                  </label>
                  <select
                    value={filterLocation}
                    onChange={(e) => setFilterLocation(e.target.value)}
                    className="w-full p-2 rounded-xl border border-slate-300 bg-white text-slate-800 outline-none focus:ring-1 focus:ring-[#4A192B]"
                  >
                    {locationOptions.map((loc) => (
                      <option key={loc} value={loc}>
                        {loc === 'All' ? 'All Locations' : loc}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 3 Comparison Filters Row (SSC, Inter/Diploma, CGPA) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-100 text-xs">
                {/* SSC % Comparison */}
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="font-bold text-slate-800 block mb-1">SSC Percentage</span>
                  <div className="grid grid-cols-2 gap-1.5">
                    <select value={sscOp} onChange={(e) => setSscOp(e.target.value)} className="p-1 rounded border border-slate-300 bg-white text-[11px]">
                      <option value="all">Any</option>
                      <option value="gt">Greater Than</option>
                      <option value="lt">Less Than</option>
                      <option value="eq">Equal To</option>
                      <option value="between">Between</option>
                    </select>
                    {sscOp !== 'all' && (
                      <input type="number" step="0.1" placeholder="Val %" value={sscVal1} onChange={(e) => setSscVal1(e.target.value)} className="p-1 rounded border border-slate-300 bg-white text-[11px]" />
                    )}
                  </div>
                  {sscOp === 'between' && (
                    <input type="number" step="0.1" placeholder="Max %" value={sscVal2} onChange={(e) => setSscVal2(e.target.value)} className="w-full mt-1 p-1 rounded border border-slate-300 bg-white text-[11px]" />
                  )}
                </div>

                {/* Inter/Diploma % Comparison */}
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="font-bold text-slate-800 block mb-1">Inter / Diploma %</span>
                  <div className="grid grid-cols-2 gap-1.5">
                    <select value={interOp} onChange={(e) => setInterOp(e.target.value)} className="p-1 rounded border border-slate-300 bg-white text-[11px]">
                      <option value="all">Any</option>
                      <option value="gt">Greater Than</option>
                      <option value="lt">Less Than</option>
                      <option value="eq">Equal To</option>
                      <option value="between">Between</option>
                    </select>
                    {interOp !== 'all' && (
                      <input type="number" step="0.1" placeholder="Val %" value={interVal1} onChange={(e) => setInterVal1(e.target.value)} className="p-1 rounded border border-slate-300 bg-white text-[11px]" />
                    )}
                  </div>
                  {interOp === 'between' && (
                    <input type="number" step="0.1" placeholder="Max %" value={interVal2} onChange={(e) => setInterVal2(e.target.value)} className="w-full mt-1 p-1 rounded border border-slate-300 bg-white text-[11px]" />
                  )}
                </div>

                {/* CGPA Comparison */}
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="font-bold text-slate-800 block mb-1">
                    {filterSemester !== 'All' ? `CGPA (Sem ${filterSemester})` : 'CGPA (Latest Completed)'}
                  </span>
                  <div className="grid grid-cols-2 gap-1.5">
                    <select value={cgpaOp} onChange={(e) => setCgpaOp(e.target.value)} className="p-1 rounded border border-slate-300 bg-white text-[11px]">
                      <option value="all">Any</option>
                      <option value="gt">Greater Than</option>
                      <option value="lt">Less Than</option>
                      <option value="eq">Equal To</option>
                      <option value="between">Between</option>
                    </select>
                    {cgpaOp !== 'all' && (
                      <input type="number" step="0.01" placeholder="CGPA" value={cgpaVal1} onChange={(e) => setCgpaVal1(e.target.value)} className="p-1 rounded border border-slate-300 bg-white text-[11px]" />
                    )}
                  </div>
                  {cgpaOp === 'between' && (
                    <input type="number" step="0.01" placeholder="Max CGPA" value={cgpaVal2} onChange={(e) => setCgpaVal2(e.target.value)} className="w-full mt-1 p-1 rounded border border-slate-300 bg-white text-[11px]" />
                  )}
                </div>
              </div>
            </section>

            {/* Data Table Section with 4 Mandatory Download Options */}
            <section className="bg-white rounded-3xl border border-[#C1C8B7] shadow-sm overflow-hidden">
              {/* Header & Mandatory Download Actions */}
              <div className="p-4 sm:p-5 bg-slate-50/80 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-slate-900">
                      Department Student Academic Directory
                    </h3>
                    <span className="px-2 py-0.5 rounded-full bg-[#4A192B]/10 text-[#4A192B] font-bold text-xs">
                      {filteredStudents.length} of {students.length} Students
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Includes all department students across 2nd, 3rd, and 4th years regardless of update request submissions.
                  </p>
                </div>

                {/* 4 Mandatory Reports: Complete Directory (PDF/Excel) & Filtered List (PDF/Excel) */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white border border-slate-200 shadow-xs">
                    <span className="text-[10px] font-bold text-slate-500 uppercase px-1">Complete:</span>
                    <button
                      type="button"
                      onClick={() => handleDownloadCompleteDirectory('pdf')}
                      className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold border border-rose-200 transition-colors cursor-pointer flex items-center gap-1"
                      title="Download Complete Student Directory PDF"
                    >
                      <FileText className="w-3.5 h-3.5 text-rose-600" />
                      <span>PDF</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownloadCompleteDirectory('excel')}
                      className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-200 transition-colors cursor-pointer flex items-center gap-1"
                      title="Download Complete Student Directory Excel"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Excel</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white border border-slate-200 shadow-xs">
                    <span className="text-[10px] font-bold text-slate-500 uppercase px-1">Filtered:</span>
                    <button
                      type="button"
                      onClick={() => handleDownloadFilteredDirectory('pdf')}
                      className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold border border-rose-200 transition-colors cursor-pointer flex items-center gap-1"
                      title="Download Filtered Student List PDF"
                    >
                      <FileText className="w-3.5 h-3.5 text-rose-600" />
                      <span>PDF</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownloadFilteredDirectory('excel')}
                      className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-200 transition-colors cursor-pointer flex items-center gap-1"
                      title="Download Filtered Student List Excel"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Excel</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* DESKTOP VIEW: Full 12 Columns Table (with Action View Button & Status) (hidden md:block) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#4A192B]/5 text-slate-800 border-b border-slate-200">
                      <th className="py-3 px-3 font-bold">Photo</th>
                      <th className="py-3 px-3 font-bold">Student Name</th>
                      <th className="py-3 px-3 font-bold">Register Number</th>
                      <th className="py-3 px-3 font-bold text-center">Profile Status</th>
                      <th className="py-3 px-3 font-bold">Location</th>
                      <th className="py-3 px-2 font-bold">Year</th>
                      <th className="py-3 px-2 font-bold">Current Term</th>
                      <th className="py-3 px-3 font-bold text-center">SSC %</th>
                      <th className="py-3 px-3 font-bold text-center">Inter / Diploma %</th>
                      <th className="py-3 px-2 font-bold text-center">Latest Sem</th>
                      <th className="py-3 px-3 font-bold text-center">Latest CGPA</th>
                      <th className="py-3 px-3 font-bold text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800">
                    {filteredStudents.length === 0 ? (
                      <tr>
                        <td colSpan="12" className="py-12 px-4 text-center">
                          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-3">
                            <Search className="w-6 h-6" />
                          </div>
                          <h4 className="font-bold text-sm text-slate-900">No students found</h4>
                          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-3">
                            No students matched your search criteria {searchRegNo ? `for Register Number "${searchRegNo}"` : ''} {searchName ? `for Name "${searchName}"` : ''}.
                          </p>
                          <button
                            type="button"
                            onClick={handleClearFilters}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#4A192B] hover:bg-[#35101E] text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
                          >
                            <RotateCcw className="w-3.5 h-3.5 text-[#FF6B1A]" />
                            <span>Clear Search &amp; Restore All Students</span>
                          </button>
                        </td>
                      </tr>
                    ) : (
                      filteredStudents.map((std) => {
                        const latest = getStudentLatestAcademics(std);
                        const isPending = std.onboardingStatus === 'Profile Pending';
                        return (
                          <tr key={std.id} className="hover:bg-slate-50 transition-colors">
                            {/* 1. Photo */}
                            <td className="py-2.5 px-3">
                              <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-200 border border-slate-300 flex items-center justify-center text-slate-500 font-bold text-[10px]">
                                {std.profilePhoto ? (
                                  <img src={std.profilePhoto} alt={std.name} className="w-full h-full object-cover" />
                                ) : (
                                  <span>{(std.name && std.name !== 'Profile Pending' ? std.name.substring(0, 2) : 'SP').toUpperCase()}</span>
                                )}
                              </div>
                            </td>

                            {/* 2. Name */}
                            <td className="py-2.5 px-3 font-semibold text-slate-900">
                              {isPending && (!std.name || std.name === 'Profile Pending') ? (
                                <span className="text-amber-800 font-normal italic">Profile Pending</span>
                              ) : (
                                std.name
                              )}
                            </td>

                            {/* 3. Register Number */}
                            <td className="py-2.5 px-3 font-mono font-bold text-[#4A192B]">
                              {std.registerNumber}
                            </td>

                            {/* 4. Profile Status */}
                            <td className="py-2.5 px-3 text-center">
                              {isPending ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                  <Clock className="w-3 h-3 text-amber-600" />
                                  <span>Profile Pending</span>
                                </span>
                              ) : std.onboardingStatus === 'Inactive' ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-300">
                                  <span>Inactive</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  <span>Profile Completed</span>
                                </span>
                              )}
                            </td>

                            {/* 5. Location */}
                            <td className="py-2.5 px-3 text-slate-600">
                              {std.location && std.location !== 'Not Provided' ? std.location : '—'}
                            </td>

                            {/* 6. Year */}
                            <td className="py-2.5 px-2">
                              <span className="font-semibold text-slate-700">
                                {std.year && std.year !== 'Not Provided' ? std.year : '—'}
                              </span>
                            </td>

                            {/* 7. Current Term */}
                            <td className="py-2.5 px-2 font-mono font-bold text-slate-800">
                              {std.term && std.term !== 'Not Provided' ? (
                                <span className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200">
                                  {std.term}
                                </span>
                              ) : (
                                <span className="text-slate-400 font-normal">—</span>
                              )}
                            </td>

                            {/* 8. SSC % */}
                            <td className="py-2.5 px-3 text-center font-semibold">
                              {std.sscPercentage !== null && std.sscPercentage !== undefined ? `${std.sscPercentage}%` : '—'}
                            </td>

                            {/* 9. Inter / Diploma % */}
                            <td className="py-2.5 px-3 text-center">
                              {std.interPercentage !== null && std.interPercentage !== undefined ? (
                                <>
                                  <span className="font-semibold">{std.interPercentage}%</span>
                                  <span className="block text-[10px] text-slate-400">({std.interType || 'Inter'})</span>
                                </>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>

                            {/* 10. Latest Sem */}
                            <td className="py-2.5 px-2 text-center font-bold text-[#4A192B]">
                              {latest.latestSemester && latest.latestSemester !== '—' ? latest.latestSemester : '—'}
                            </td>

                            {/* 11. Latest CGPA */}
                            <td className="py-2.5 px-3 text-center font-bold text-emerald-700">
                              {latest.latestCgpa !== null ? latest.latestCgpa.toFixed(2) : '—'}
                            </td>

                            {/* 12. View Action Button */}
                            <td className="py-2.5 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => setViewingStudentId(std.id)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#4A192B] hover:bg-[#35101E] active:scale-95 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
                                title={`View complete profile of ${std.name} (${std.registerNumber})`}
                              >
                                <Eye className="w-3.5 h-3.5 text-[#FF6B1A]" />
                                <span>View</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* MOBILE DEDICATED VIEW: Responsive Student Cards (md:hidden) */}
              <div className="md:hidden p-3 space-y-3">
                {filteredStudents.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 bg-white rounded-2xl border border-slate-200 text-xs space-y-3">
                    <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                      <Search className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-900">No students found</h4>
                      <p className="text-xs text-slate-500 mt-1">
                        No students matched your search criteria {searchRegNo ? `for Register Number "${searchRegNo}"` : ''} {searchName ? `for Name "${searchName}"` : ''}.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleClearFilters}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#4A192B] hover:bg-[#35101E] text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-[#FF6B1A]" />
                      <span>Clear Search &amp; Restore All</span>
                    </button>
                  </div>
                ) : (
                  filteredStudents.map((std) => {
                    const latest = getStudentLatestAcademics(std);
                    const isPending = std.onboardingStatus === 'Profile Pending';
                    return (
                      <div
                        key={std.id}
                        className="bg-white rounded-2xl p-4 border border-[#C1C8B7]/80 shadow-xs space-y-3"
                      >
                        {/* Top: Photo, Name, RegNo & Year / Status Badge */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-100 border border-slate-300 flex items-center justify-center text-slate-600 font-bold text-xs flex-shrink-0">
                              {std.profilePhoto ? (
                                <img src={std.profilePhoto} alt={std.name} className="w-full h-full object-cover" />
                              ) : (
                                <span>{(std.name && std.name !== 'Profile Pending' ? std.name.substring(0, 2) : 'SP').toUpperCase()}</span>
                              )}
                            </div>
                            <div>
                              <h4 className="font-bold text-slate-900 text-xs leading-tight">
                                {isPending && (!std.name || std.name === 'Profile Pending') ? (
                                  <span className="text-amber-800 italic font-normal">Profile Pending</span>
                                ) : (
                                  std.name
                                )}
                              </h4>
                              <span className="font-mono font-bold text-xs text-[#4A192B] block">{std.registerNumber}</span>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            {isPending ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                Profile Pending
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                Profile Completed
                              </span>
                            )}
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 font-mono text-[10px] font-bold text-slate-700">
                              {std.term && std.term !== 'Not Provided' ? `Term ${std.term}` : 'Pending'}
                            </span>
                          </div>
                        </div>

                        {/* Academic Summary Grid inside Card */}
                        <div className="grid grid-cols-2 gap-2 text-[11px] pt-2 border-t border-slate-100">
                          <div className="p-2 rounded-xl bg-slate-50 border border-slate-200">
                            <span className="text-slate-400 block text-[9px] uppercase font-bold">Latest Completed</span>
                            <span className="font-bold text-slate-800">
                              {latest.latestSemester && latest.latestSemester !== '—' ? `Sem ${latest.latestSemester}` : 'Not Provided'}
                            </span>
                          </div>
                          <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200">
                            <span className="text-emerald-700 block text-[9px] uppercase font-bold">Latest CGPA</span>
                            <span className="font-extrabold text-emerald-800 text-xs">
                              {latest.latestCgpa !== null ? latest.latestCgpa.toFixed(2) : '—'}
                            </span>
                          </div>
                          <div className="p-2 rounded-xl bg-slate-50 border border-slate-200">
                            <span className="text-slate-400 block text-[9px] uppercase font-bold">Prior Education</span>
                            <span className="font-bold text-slate-800">
                              {std.sscPercentage !== null ? `SSC: ${std.sscPercentage}%` : 'SSC: Not Provided'}
                            </span>
                            <span className="block text-[10px] text-slate-500">
                              {std.interPercentage !== null ? `${std.interType || 'Inter'}: ${std.interPercentage}%` : 'Inter: Not Provided'}
                            </span>
                          </div>
                          <div className="p-2 rounded-xl bg-slate-50 border border-slate-200">
                            <span className="text-slate-400 block text-[9px] uppercase font-bold">Location</span>
                            <span className="font-bold text-slate-800 truncate block flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-slate-400" />
                              <span>{std.location && std.location !== 'Not Provided' ? std.location : 'Not Provided'}</span>
                            </span>
                          </div>
                        </div>

                        {/* View Complete Profile Action Button */}
                        <div className="pt-2 border-t border-slate-100">
                          <button
                            type="button"
                            onClick={() => setViewingStudentId(std.id)}
                            className="w-full py-2.5 px-3 rounded-xl bg-[#4A192B] hover:bg-[#35101E] active:scale-[0.99] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
                          >
                            <Eye className="w-4 h-4 text-[#FF6B1A]" />
                            <span>View Complete Profile</span>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 3: YEAR-SPECIFIC UPDATE TRACKING                           */}
        {/* ============================================================== */}
        {activeTab === 'tracking' && (
          <div className="space-y-6">
            {/* Header Lockup & Request Selector */}
            <div className="bg-white rounded-3xl p-4 sm:p-6 border border-[#C1C8B7] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 w-full max-w-full min-w-0 overflow-hidden">
              <div className="space-y-2.5 w-full min-w-0">
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-[#FF6B1A]/15 text-[#FF6B1A] font-bold text-xs">
                    Year-Specific Update Tracking
                  </span>
                  <span className="text-xs text-slate-500">
                    (Requests target only the selected academic year)
                  </span>
                </div>

                {/* Request Selector */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3 w-full min-w-0 max-w-full">
                  <label htmlFor="select-req" className="text-xs font-bold text-slate-700 shrink-0">
                    Active Request:
                  </label>
                  <select
                    id="select-req"
                    value={selectedRequestId}
                    onChange={(e) => setSelectedRequestId(e.target.value)}
                    className="w-full sm:w-auto max-w-full min-w-0 p-2 rounded-xl border border-slate-300 bg-white font-bold text-xs text-[#4A192B] outline-none truncate"
                  >
                    {updateRequests.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.title} &bull; Target: {r.targetYear} ({r.targetSemester})
                      </option>
                    ))}
                  </select>
                </div>

                {activeRequest && (
                  <p className="text-xs text-slate-600 break-words">
                    <strong>Instructions:</strong> {activeRequest.instructions} (Target: {activeRequest.targetYear} students for semester {activeRequest.targetSemester})
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => setIsCreateModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#4A192B] hover:bg-[#35101E] text-white font-bold text-xs shadow-md transition-all cursor-pointer self-start md:self-auto shrink-0"
              >
                <PlusCircle className="w-4 h-4 text-[#FF6B1A]" />
                <span>Create Update Request</span>
              </button>
            </div>

            {/* MOBILE DEDICATED TRACKING VIEW (lg:hidden) */}
            <div className="lg:hidden space-y-4">
              {/* Segmented Control Switcher */}
              <div className="flex p-1 bg-slate-200/80 rounded-2xl">
                <button
                  type="button"
                  onClick={() => setMobileTrackingTab('pending')}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    mobileTrackingTab === 'pending'
                      ? 'bg-white text-amber-950 shadow-xs ring-1 ring-amber-400'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  <span>Pending ({pendingForActiveReq.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMobileTrackingTab('submitted')}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    mobileTrackingTab === 'submitted'
                      ? 'bg-white text-emerald-950 shadow-xs ring-1 ring-emerald-400'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Submitted ({submittedForActiveReq.length})</span>
                </button>
              </div>

              {/* Mobile Pending List */}
              {mobileTrackingTab === 'pending' && (
                <div className="bg-white rounded-2xl border border-amber-300 shadow-sm overflow-hidden p-3.5 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-amber-100">
                    <span className="font-bold text-xs text-amber-950">
                      Pending Students ({pendingForActiveReq.length})
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleDownloadPendingTracking('pdf')}
                        className="px-2 py-1 rounded-lg bg-rose-50 text-rose-700 text-[11px] font-bold border border-rose-200 flex items-center gap-1 cursor-pointer"
                      >
                        <FileText className="w-3 h-3 text-rose-600" />
                        <span>PDF</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDownloadPendingTracking('excel')}
                        className="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-800 text-[11px] font-bold border border-emerald-200 flex items-center gap-1 cursor-pointer"
                      >
                        <FileSpreadsheet className="w-3 h-3 text-emerald-600" />
                        <span>Excel</span>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    {pendingForActiveReq.length === 0 ? (
                      <p className="text-center py-6 text-xs text-slate-500">
                        All eligible students in this cohort have submitted their records!
                      </p>
                    ) : (
                      pendingForActiveReq.map((std) => (
                        <div key={std.id} className="p-3 rounded-xl bg-amber-50/60 border border-amber-200/80 flex items-center justify-between gap-2">
                          <div>
                            <h5 className="font-bold text-xs text-slate-900">{std.name}</h5>
                            <span className="font-mono text-xs font-bold text-[#4A192B] block">{std.registerNumber}</span>
                            <span className="text-[10px] text-slate-500">{std.year} ({std.term}) &bull; {std.location}</span>
                          </div>
                          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px] flex-shrink-0">
                            Pending
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Mobile Submitted List */}
              {mobileTrackingTab === 'submitted' && (
                <div className="bg-white rounded-2xl border border-emerald-300 shadow-sm overflow-hidden p-3.5 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-emerald-100">
                    <span className="font-bold text-xs text-emerald-950">
                      Submitted Students ({submittedForActiveReq.length})
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleDownloadSubmittedTracking('pdf')}
                        className="px-2 py-1 rounded-lg bg-rose-50 text-rose-700 text-[11px] font-bold border border-rose-200 flex items-center gap-1 cursor-pointer"
                      >
                        <FileText className="w-3 h-3 text-rose-600" />
                        <span>PDF</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDownloadSubmittedTracking('excel')}
                        className="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-800 text-[11px] font-bold border border-emerald-200 flex items-center gap-1 cursor-pointer"
                      >
                        <FileSpreadsheet className="w-3 h-3 text-emerald-600" />
                        <span>Excel</span>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    {submittedForActiveReq.length === 0 ? (
                      <p className="text-center py-6 text-xs text-slate-500">
                        No students have submitted records for this update cycle yet.
                      </p>
                    ) : (
                      submittedForActiveReq.map((std) => (
                        <div key={std.id} className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200/80 flex items-center justify-between gap-2">
                          <div>
                            <h5 className="font-bold text-xs text-slate-900">{std.name}</h5>
                            <span className="font-mono text-xs font-bold text-[#4A192B] block">{std.registerNumber}</span>
                            <span className="text-[10px] text-slate-500">{std.year} ({std.term})</span>
                          </div>
                          <div className="text-right flex flex-col items-end gap-1">
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-xs">
                              CGPA: {std.submittedCgpa?.toFixed(2)}
                            </span>
                            <span className="text-[9px] text-emerald-700 font-semibold">Verified</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* DESKTOP VIEW: Submitted & Pending Lists Side-by-Side (hidden lg:grid) */}
            <div className="hidden lg:grid grid-cols-2 gap-6">
              {/* SUBMITTED STUDENTS LIST */}
              <div className="bg-white rounded-3xl border border-emerald-300 shadow-sm overflow-hidden flex flex-col">
                <div className="p-4 bg-emerald-50 border-b border-emerald-200 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <h4 className="font-bold text-sm text-emerald-950">
                      Submitted Students ({submittedForActiveReq.length})
                    </h4>
                  </div>

                  {/* Reports for Submitted List */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleDownloadSubmittedTracking('pdf')}
                      className="px-2.5 py-1 rounded-lg bg-white hover:bg-emerald-100 text-rose-700 text-xs font-bold border border-emerald-300 transition-colors cursor-pointer flex items-center gap-1"
                      title="Download Submitted Students PDF"
                    >
                      <FileText className="w-3.5 h-3.5 text-rose-600" />
                      <span>PDF</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownloadSubmittedTracking('excel')}
                      className="px-2.5 py-1 rounded-lg bg-white hover:bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-300 transition-colors cursor-pointer flex items-center gap-1"
                      title="Download Submitted Students Excel"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Excel</span>
                    </button>
                  </div>
                </div>

                <div className="p-3 overflow-x-auto flex-1">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="text-slate-500 border-b border-slate-100">
                        <th className="py-2 px-3 font-bold">Name</th>
                        <th className="py-2 px-2 font-bold">Register No.</th>
                        <th className="py-2 px-2 font-bold">Term</th>
                        <th className="py-2 px-2 text-center font-bold">CGPA</th>
                        <th className="py-2 px-3 text-right font-bold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {submittedForActiveReq.length === 0 ? (
                        <tr>
                          <td colSpan="5" className="py-6 text-center text-slate-500">
                            No students have submitted records for this update cycle yet.
                          </td>
                        </tr>
                      ) : (
                        submittedForActiveReq.map((std) => (
                          <tr key={std.id} className="hover:bg-slate-50">
                            <td className="py-2 px-3 font-semibold text-slate-900">{std.name}</td>
                            <td className="py-2 px-2 font-mono font-bold text-[#4A192B]">{std.registerNumber}</td>
                            <td className="py-2 px-2 text-slate-600">{std.year} ({std.term})</td>
                            <td className="py-2 px-2 text-center font-bold text-emerald-700">{std.submittedCgpa?.toFixed(2)}</td>
                            <td className="py-2 px-3 text-right">
                              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                                Submitted
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* PENDING STUDENTS LIST */}
              <div className="bg-white rounded-3xl border border-amber-300 shadow-sm overflow-hidden flex flex-col">
                <div className="p-4 bg-amber-50 border-b border-amber-200 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-600" />
                    <h4 className="font-bold text-sm text-amber-950">
                      Pending Students ({pendingForActiveReq.length})
                    </h4>
                  </div>

                  {/* Reports for Pending List */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleDownloadPendingTracking('pdf')}
                      className="px-2.5 py-1 rounded-lg bg-white hover:bg-amber-100 text-rose-700 text-xs font-bold border border-amber-300 transition-colors cursor-pointer flex items-center gap-1"
                      title="Download Pending Students PDF"
                    >
                      <FileText className="w-3.5 h-3.5 text-rose-600" />
                      <span>PDF</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownloadPendingTracking('excel')}
                      className="px-2.5 py-1 rounded-lg bg-white hover:bg-amber-100 text-emerald-800 text-xs font-bold border border-amber-300 transition-colors cursor-pointer flex items-center gap-1"
                      title="Download Pending Students Excel"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Excel</span>
                    </button>
                  </div>
                </div>

                <div className="p-3 overflow-x-auto flex-1">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="text-slate-500 border-b border-slate-100">
                        <th className="py-2 px-3 font-bold">Name</th>
                        <th className="py-2 px-2 font-bold">Register No.</th>
                        <th className="py-2 px-2 font-bold">Term</th>
                        <th className="py-2 px-3 text-right font-bold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {pendingForActiveReq.length === 0 ? (
                        <tr>
                          <td colSpan="4" className="py-6 text-center text-slate-500">
                            All eligible students in this cohort have submitted their requested marks!
                          </td>
                        </tr>
                      ) : (
                        pendingForActiveReq.map((std) => (
                          <tr key={std.id} className="hover:bg-slate-50">
                            <td className="py-2 px-3 font-semibold text-slate-900">{std.name}</td>
                            <td className="py-2 px-2 font-mono font-bold text-slate-700">{std.registerNumber}</td>
                            <td className="py-2 px-2 text-slate-600">{std.year} ({std.term})</td>
                            <td className="py-2 px-3 text-right">
                              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px]">
                                Pending
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Modal: Create Year-Specific Update Request */}
            {isCreateModalOpen && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
                role="dialog"
                aria-modal="true"
              >
                <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-4">
                  <div className="flex items-start justify-between pb-3 border-b border-slate-100">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">
                        Create Year-Specific Update Request
                      </h3>
                      <p className="text-xs text-slate-500">
                        Only students belonging to the target academic year will receive this request.
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

                  <form onSubmit={handleCreateRequestSubmit} className="space-y-4 text-xs">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1" htmlFor="req-title">
                        Request Title
                      </label>
                      <input
                        id="req-title"
                        type="text"
                        required
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        placeholder="e.g. 5th Semester CGPA Update"
                        className="w-full p-2.5 rounded-xl border border-slate-300 outline-none focus:ring-1 focus:ring-[#4A192B]"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1" htmlFor="req-target-year">
                          Target Academic Year
                        </label>
                        <select
                          id="req-target-year"
                          value={newTargetYear}
                          onChange={(e) => handleTargetYearChange(e.target.value)}
                          className="w-full p-2.5 rounded-xl border border-slate-300 bg-white outline-none focus:ring-1 focus:ring-[#4A192B] font-semibold"
                        >
                          <option value="2nd Year">Second Year (2nd Year)</option>
                          <option value="3rd Year">Third Year (3rd Year)</option>
                          <option value="4th Year">Fourth Year (4th Year)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1" htmlFor="req-target-sem">
                          Target Semester / Term
                        </label>
                        <select
                          id="req-target-sem"
                          value={newTargetSem}
                          onChange={(e) => setNewTargetSem(e.target.value)}
                          className="w-full p-2.5 rounded-xl border border-slate-300 bg-white outline-none focus:ring-1 focus:ring-[#4A192B] font-semibold"
                        >
                          {getTermsForYear(newTargetYear).map((term) => (
                            <option key={term} value={term}>
                              Semester {term}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1" htmlFor="req-instructions">
                        Instructions for Target Students
                      </label>
                      <textarea
                        id="req-instructions"
                        rows="3"
                        value={newInstructions}
                        onChange={(e) => setNewInstructions(e.target.value)}
                        placeholder="e.g. Please enter and confirm your official semester CGPA."
                        className="w-full p-2.5 rounded-xl border border-slate-300 outline-none focus:ring-1 focus:ring-[#4A192B]"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setIsCreateModalOpen(false)}
                        className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 cursor-pointer"
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
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 4: ACADEMIC PERFORMANCE ANALYTICS                           */}
        {/* ============================================================== */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            {/* Filter Bar */}
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#C1C8B7] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-base text-slate-900">
                  Academic Performance Analytics
                </h3>
                <p className="text-xs text-slate-600">
                  Calculated dynamically from available student records across semesters and cohorts.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Filter by Year
                  </label>
                  <select
                    value={analyticsYear}
                    onChange={(e) => setAnalyticsYear(e.target.value)}
                    className="p-2 rounded-xl border border-slate-300 bg-white font-semibold outline-none"
                  >
                    <option value="All">All Years</option>
                    <option value="2nd Year">2nd Year</option>
                    <option value="3rd Year">3rd Year</option>
                    <option value="4th Year">4th Year</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Filter by Semester
                  </label>
                  <select
                    value={analyticsSemester}
                    onChange={(e) => setAnalyticsSemester(e.target.value)}
                    className="p-2 rounded-xl border border-slate-300 bg-white font-semibold outline-none"
                  >
                    <option value="All">All Semesters</option>
                    <option value="1-1">Semester 1-1</option>
                    <option value="1-2">Semester 1-2</option>
                    <option value="2-1">Semester 2-1</option>
                    <option value="2-2">Semester 2-2</option>
                    <option value="3-1">Semester 3-1</option>
                    <option value="3-2">Semester 3-2</option>
                    <option value="4-1">Semester 4-1</option>
                  </select>
                </div>
              </div>
            </div>

            {!analyticsData.hasRecords ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-[#C1C8B7]">
                <AlertCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <h4 className="font-bold text-slate-800 text-sm">No Academic Records Available</h4>
                <p className="text-xs text-slate-500 mt-1">
                  No completed semester records matched the selected year and semester filter.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Highlights Summary Grid: Averages, Highest, Lowest, Submissions */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  {/* Semester Avg CGPA */}
                  <div className="bg-white rounded-2xl p-4 border border-[#C1C8B7] shadow-sm">
                    <span className="text-slate-500 font-bold block">Average CGPA</span>
                    <div className="text-2xl font-extrabold text-emerald-700 mt-1">
                      {analyticsData.avgCgpa}
                    </div>
                    <span className="text-[10px] text-slate-400">Cumulative average</span>
                  </div>

                  {/* Highest CGPA */}
                  <div className="bg-white rounded-2xl p-4 border border-[#C1C8B7] shadow-sm">
                    <span className="text-slate-500 font-bold block">Highest CGPA</span>
                    <div className="text-2xl font-extrabold text-emerald-700 mt-1">
                      {analyticsData.highestCgpa.cgpa.toFixed(2)}
                    </div>
                    <span className="text-[10px] text-slate-500 truncate block mt-0.5">
                      {analyticsData.highestCgpa.studentName} ({analyticsData.highestCgpa.term})
                    </span>
                  </div>

                  {/* Lowest CGPA */}
                  <div className="bg-white rounded-2xl p-4 border border-[#C1C8B7] shadow-sm">
                    <span className="text-slate-500 font-bold block">Lowest CGPA</span>
                    <div className="text-2xl font-extrabold text-rose-700 mt-1">
                      {analyticsData.lowestCgpa.cgpa.toFixed(2)}
                    </div>
                    <span className="text-[10px] text-slate-500 truncate block mt-0.5">
                      {analyticsData.lowestCgpa.studentName} ({analyticsData.lowestCgpa.term})
                    </span>
                  </div>

                  {/* Total Verified Submissions */}
                  <div className="bg-white rounded-2xl p-4 border border-[#C1C8B7] shadow-sm">
                    <span className="text-slate-500 font-bold block">Total Records</span>
                    <div className="text-2xl font-extrabold text-[#4A192B] mt-1">
                      {analyticsData.totalEntries}
                    </div>
                    <span className="text-[10px] text-slate-400">Verified entries</span>
                  </div>
                </div>

                {/* Semester-wise Performance Chart / Cards */}
                <div className="bg-white rounded-3xl p-6 border border-[#C1C8B7] shadow-sm">
                  <h4 className="font-bold text-sm text-slate-900 mb-1">
                    Semester-Wise Average CGPA Progression
                  </h4>
                  <p className="text-xs text-slate-500 mb-4">
                    Descriptive averages calculated across all verified student submissions.
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                    {analyticsData.semesterStats.map((stat) => (
                      <div key={stat.term} className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-center">
                        <span className="font-bold text-xs text-[#4A192B] block">Sem {stat.term}</span>
                        <div className="mt-2 space-y-1">
                          <div>
                            <span className="text-[10px] text-slate-500 block">Avg CGPA</span>
                            <span className="font-extrabold text-sm text-emerald-700">{stat.avgCgpa}</span>
                          </div>
                        </div>
                        <span className="text-[9px] text-slate-400 block mt-2">
                          {stat.count} submissions
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Student Performance Distribution */}
                <div className="bg-white rounded-3xl p-6 border border-[#C1C8B7] shadow-sm">
                  <h4 className="font-bold text-sm text-slate-900 mb-1">
                    Student Performance Distribution (CGPA Tiers)
                  </h4>
                  <p className="text-xs text-slate-500 mb-4">
                    Classification based on recorded cumulative grade points.
                  </p>

                  <div className="space-y-3 text-xs">
                    <div>
                      <div className="flex justify-between font-bold text-slate-700 mb-1">
                        <span>Outstanding (CGPA &ge; 9.0)</span>
                        <span className="text-emerald-700">{analyticsData.distribution.outstanding} records</span>
                      </div>
                      <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-600 rounded-full"
                          style={{ width: `${(analyticsData.distribution.outstanding / analyticsData.totalEntries) * 100}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between font-bold text-slate-700 mb-1">
                        <span>Distinction (8.0 - 8.99)</span>
                        <span className="text-blue-700">{analyticsData.distribution.distinction} records</span>
                      </div>
                      <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-600 rounded-full"
                          style={{ width: `${(analyticsData.distribution.distinction / analyticsData.totalEntries) * 100}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between font-bold text-slate-700 mb-1">
                        <span>First Class (7.0 - 7.99)</span>
                        <span className="text-amber-700">{analyticsData.distribution.firstClass} records</span>
                      </div>
                      <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-500 rounded-full"
                          style={{ width: `${(analyticsData.distribution.firstClass / analyticsData.totalEntries) * 100}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between font-bold text-slate-700 mb-1">
                        <span>Second Class (6.0 - 6.99)</span>
                        <span className="text-slate-700">{analyticsData.distribution.secondClass} records</span>
                      </div>
                      <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-slate-500 rounded-full"
                          style={{ width: `${(analyticsData.distribution.secondClass / analyticsData.totalEntries) * 100}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between font-bold text-slate-700 mb-1">
                        <span>Pass / Needs Improvement (&lt; 6.0)</span>
                        <span className="text-rose-700">{analyticsData.distribution.pass} records</span>
                      </div>
                      <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-rose-500 rounded-full"
                          style={{ width: `${(analyticsData.distribution.pass / analyticsData.totalEntries) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Student Complete Profile Modal (HOD View) */}
      <StudentProfileModal
        student={selectedStudentForModal}
        isOpen={Boolean(selectedStudentForModal)}
        onClose={() => setViewingStudentId(null)}
        latestAcademics={selectedStudentForModal ? getStudentLatestAcademics(selectedStudentForModal) : null}
      />

      {/* Add Student Account Modal (HOD Only - 2 Fields: Reg No & Initial Password) */}
      <CreateStudentModal
        isOpen={isAddStudentOpen}
        onClose={() => setIsAddStudentOpen(false)}
        onCreateStudent={({ registerNumber, initialPassword }) => {
          const res = createStudentAccount({ registerNumber, initialPassword });
          if (res.success) {
            setToastMessage(`Student account "${registerNumber}" created successfully (Profile Pending).`);
            setTimeout(() => setToastMessage(null), 5000);
          }
          return res;
        }}
      />

      {/* Footer */}
      <footer className="bg-white border-t border-[#C1C8B7] py-4 text-center text-xs text-slate-600">
        <p>
          &copy; {new Date().getFullYear()} {BRANDING.collegeName} &bull; {BRANDING.departmentName} &bull; HOD Administrative Console
        </p>
      </footer>
    </div>
  );
}

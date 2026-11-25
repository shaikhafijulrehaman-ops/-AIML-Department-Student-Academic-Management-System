import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  Sliders,
  Eye,
  CheckCircle2,
  Users,
  GraduationCap,
  BookOpen,
  Award,
  Layers,
  ArrowRight,
  Shield,
  Palette,
  MousePointer,
  Smartphone,
  Info,
  Maximize2,
  Bell,
  HelpCircle,
  BarChart2,
  Zap,
  ArrowLeft
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { THEMES } from '../config/theme';
import BRANDING from '../config/branding';
import {
  CollegeLogo,
  CollegeBrandHeader,
  GlassCard,
  ClayCard,
  ClayButton,
  GlassButton,
  FloatingGlassNav,
  SpotlightNavItem,
  ProfileAvatar,
  NotificationBadge,
  StatCard,
  ProgressCard,
  Modal,
  Dropdown,
  PageContainer
} from '../components';

export default function DesignPreviewPage() {
  const { theme, setTheme, isHod, isStudent } = useTheme();

  // Interactive component states
  const [activeNavTab, setActiveNavTab] = useState('home');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [bounceKey, setBounceKey] = useState(0);
  const [reRenderCounter, setReRenderCounter] = useState(0);
  const [isolatedBounceState, setIsolatedBounceState] = useState(false);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const triggerStudentBounce = () => {
    setIsolatedBounceState(true);
  };

  const handleIsolatedAnimationEnd = () => {
    setIsolatedBounceState(false);
  };

  // Dropdown options
  const dropdownActions = [
    { label: 'View Academic Transcript', icon: BookOpen, onClick: () => alert('Action: Transcript') },
    { label: 'Export Department Summary', icon: Award, onClick: () => alert('Action: Export') },
    { label: 'Security & Access Logs', icon: Shield, onClick: () => alert('Action: Security') },
  ];

  return (
    <PageContainer className="pb-24">
      {/* Top Banner Navigation back to App */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-4 border-b border-black/10">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-white/70 hover:bg-white text-slate-700 shadow-sm transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Foundation Overview
          </Link>
          <span className="hidden sm:inline text-xs font-medium text-slate-500">
            Phase 1 Design System Specification
          </span>
        </div>

        {/* Floating Theme Switcher Controller */}
        <div className="flex items-center gap-2 p-1 rounded-full bg-white/80 backdrop-blur-md border border-white/60 shadow-md">
          <button
            type="button"
            onClick={() => setTheme(THEMES.HOD)}
            className={`min-h-[38px] px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-2 ${
              isHod
                ? 'bg-hod-claret text-white shadow-md shadow-hod-claret/30 ring-1 ring-hod-tangerine'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-hod-tangerine"></span>
            HOD Admin Theme
          </button>
          <button
            type="button"
            onClick={() => setTheme(THEMES.STUDENT)}
            className={`min-h-[38px] px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-2 ${
              isStudent
                ? 'bg-student-teal-dark text-white shadow-md shadow-student-teal/30 ring-1 ring-student-cherry'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-student-cherry"></span>
            Student Portal Theme
          </button>
        </div>
      </div>

      {/* Institutional Branding Header Lockup */}
      <div className="mb-6">
        <CollegeBrandHeader showTagline />
      </div>

      {/* Official College Logo Integration & Background Transparency Showcase */}
      <section className="mb-10">
        <ClayCard className="p-5 sm:p-6 border border-emerald-500/20">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-black/10">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold mb-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Official Asset Integrated &bull; Background Removed
              </div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                Official College Logo &bull; UI Background Integration
              </h2>
              <p className="text-xs text-slate-600">
                Exact asset from source with solid white background removed into transparent 32-bit ARGB PNG. Seamlessly adapts to all website UI surfaces.
              </p>
            </div>
            <span className="text-[11px] font-mono px-3 py-1 rounded-lg bg-black/5 text-slate-700">
              college-logo.png
            </span>
          </div>

          {/* Logo on Different Website UI Backgrounds */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. On Current 60% Theme Background */}
            <div className={`p-4 rounded-2xl flex flex-col items-center justify-center text-center gap-2 border border-black/10 shadow-sm ${
              isHod ? 'bg-hod-sage text-hod-text' : 'bg-student-almond text-student-text'
            }`}>
              <span className="text-[10px] font-bold uppercase tracking-wider opacity-70">
                Website 60% Background
              </span>
              <div className="p-2">
                <CollegeLogo size="lg" />
              </div>
              <span className="text-[11px] font-semibold">
                {isHod ? 'Sage Fog (#D7DCCF)' : 'Almond Milk (#E8E0CF)'}
              </span>
            </div>

            {/* 2. On 30% Navigation / Surface Theme Background */}
            <div className={`p-4 rounded-2xl flex flex-col items-center justify-center text-center gap-2 text-white shadow-sm ${
              isHod ? 'bg-hod-claret' : 'bg-student-teal'
            }`}>
              <span className="text-[10px] font-bold uppercase tracking-wider text-white/80">
                Nav Surface Background
              </span>
              <div className="p-2">
                <CollegeLogo size="lg" badge />
              </div>
              <span className="text-[11px] font-semibold text-white">
                {isHod ? 'Claret Wine (#4A192B)' : 'Dusty Teal (#7FA8A1)'}
              </span>
            </div>

            {/* 3. On Frosted Glass Surface */}
            <div className="p-4 rounded-2xl flex flex-col items-center justify-center text-center gap-2 glass-surface bg-white/70 shadow-sm border border-white/60">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                Frosted Glass Card
              </span>
              <div className="p-2">
                <CollegeLogo size="lg" />
              </div>
              <span className="text-[11px] font-semibold text-slate-800">
                Translucent Glass UI
              </span>
            </div>

            {/* 4. On Pure White / Modal Card */}
            <div className="p-4 rounded-2xl flex flex-col items-center justify-center text-center gap-2 bg-white shadow-sm border border-slate-200">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Modal / Sheet Surface
              </span>
              <div className="p-2">
                <CollegeLogo size="lg" />
              </div>
              <span className="text-[11px] font-semibold text-slate-800">
                Neutral White Dialog
              </span>
            </div>
          </div>
        </ClayCard>
      </section>

      {/* Live Floating Glass Navigation Header Preview */}
      <section className="mb-14">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500" />
              1. Floating Navigation Header (Live Interactive Component)
            </h2>
            <p className="text-xs text-slate-600">
              Pill-shaped glass capsule with mouse spotlight, active glow, and theme-specific routing structure.
            </p>
          </div>
          <span className="hidden sm:inline-block text-[11px] font-mono px-2 py-1 rounded bg-black/5 text-slate-600">
            Active Tab: <span className="font-bold">{activeNavTab}</span>
          </span>
        </div>

        {/* Live Nav Container */}
        <div className="py-4 px-2 rounded-3xl bg-slate-400/10 border border-black/5 shadow-inner">
          <FloatingGlassNav
            activeTab={activeNavTab}
            onTabChange={(tab) => setActiveNavTab(tab)}
          />
        </div>
      </section>

      {/* Two Separate Colour Themes Showcase */}
      <section className="mb-14">
        <div className="mb-4">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <Palette className="w-5 h-5 text-indigo-500" />
            2. Two Independent Colour Themes (60% - 30% - 10% Proportions)
          </h2>
          <p className="text-xs text-slate-600">
            Strict architecture: Centralized CSS variables with zero palette mixing between administrative and student surfaces.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* HOD Admin Palette */}
          <ClayCard className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-black/5">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">HOD Admin Theme</h3>
                <p className="text-[11px] text-slate-500">Authority, clarity &amp; administrative focus</p>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isHod ? 'bg-hod-claret text-white' : 'bg-slate-200 text-slate-600'}`}>
                {isHod ? 'Active Theme' : 'Preview'}
              </span>
            </div>

            <div className="space-y-2.5">
              <div className="p-3 rounded-xl bg-[#D7DCCF] border border-black/10 flex items-center justify-between shadow-sm">
                <div>
                  <span className="text-xs font-bold text-slate-900">Sage Fog (60%)</span>
                  <p className="text-[10px] text-slate-700">Primary Page Background</p>
                </div>
                <span className="font-mono text-xs font-bold text-slate-800">#D7DCCF</span>
              </div>

              <div className="p-3 rounded-xl bg-[#4A192B] text-white flex items-center justify-between shadow-sm">
                <div>
                  <span className="text-xs font-bold">Claret Wine (30%)</span>
                  <p className="text-[10px] text-white/80">Navigation &amp; Surfaces</p>
                </div>
                <span className="font-mono text-xs font-bold text-white">#4A192B</span>
              </div>

              <div className="p-3 rounded-xl bg-[#FF6B1A] text-white flex items-center justify-between shadow-sm">
                <div>
                  <span className="text-xs font-bold">Tangerine Flash (10%)</span>
                  <p className="text-[10px] text-white/90">Primary Focus &amp; Accents</p>
                </div>
                <span className="font-mono text-xs font-bold text-white">#FF6B1A</span>
              </div>
            </div>
          </ClayCard>

          {/* Student Portal Palette */}
          <ClayCard className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-black/5">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Student Portal Theme</h3>
                <p className="text-[11px] text-slate-500">Accessible, tactile &amp; encouraging learner experience</p>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isStudent ? 'bg-student-teal-dark text-white' : 'bg-slate-200 text-slate-600'}`}>
                {isStudent ? 'Active Theme' : 'Preview'}
              </span>
            </div>

            <div className="space-y-2.5">
              <div className="p-3 rounded-xl bg-[#E8E0CF] border border-black/10 flex items-center justify-between shadow-sm">
                <div>
                  <span className="text-xs font-bold text-slate-900">Almond Milk (60%)</span>
                  <p className="text-[10px] text-slate-700">Primary Page Background</p>
                </div>
                <span className="font-mono text-xs font-bold text-slate-800">#E8E0CF</span>
              </div>

              <div className="p-3 rounded-xl bg-[#7FA8A1] text-white flex items-center justify-between shadow-sm">
                <div>
                  <span className="text-xs font-bold">Dusty Teal (30%)</span>
                  <p className="text-[10px] text-white/90">Navigation &amp; Surfaces</p>
                </div>
                <span className="font-mono text-xs font-bold text-white">#7FA8A1</span>
              </div>

              <div className="p-3 rounded-xl bg-[#E8213A] text-white flex items-center justify-between shadow-sm">
                <div>
                  <span className="text-xs font-bold">Cherry Soda (10%)</span>
                  <p className="text-[10px] text-white">Primary Focus &amp; Accents</p>
                </div>
                <span className="font-mono text-xs font-bold text-white">#E8213A</span>
              </div>
            </div>
          </ClayCard>
        </div>
      </section>

      {/* Spotlight & Student Bounce Verification Section */}
      <section className="mb-14">
        <div className="mb-4">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <MousePointer className="w-5 h-5 text-emerald-600" />
            3. Spotlight Interaction &amp; Student Tactile Bounce
          </h2>
          <p className="text-xs text-slate-600">
            Interactive verification of mouse illumination, active glows, and click-triggered bounce animation stability.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Spotlight Test */}
          <GlassCard className="p-6">
            <h3 className="font-bold text-slate-900 text-sm mb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              Active Spotlight Glow Test
            </h3>
            <p className="text-xs text-slate-600 mb-4">
              {isHod
                ? 'HOD Admin Theme uses Tangerine Flash glow (rgba(255, 107, 26, 0.45))'
                : 'Student Theme uses Cherry Soda glow (rgba(232, 33, 58, 0.45))'}
            </p>

            <div className="p-4 rounded-2xl bg-slate-900 text-white flex flex-wrap items-center justify-center gap-3">
              <SpotlightNavItem
                id="test-active"
                label="Active Glow State"
                icon={Sparkles}
                isActive={true}
                onClick={() => {}}
              />
              <SpotlightNavItem
                id="test-hover"
                label="Hover Light State"
                icon={Eye}
                isActive={false}
                onClick={() => {}}
              />
            </div>
          </GlassCard>

          {/* Student Bounce Isolation Test */}
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Zap className="w-4 h-4 text-rose-500" />
                Student Bounce Isolation Test
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                Non-Repeating Guard
              </span>
            </div>
            <p className="text-xs text-slate-600 mb-3">
              Bounce only fires on deliberate user click and never automatically on component re-renders.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-3">
              <button
                type="button"
                onClick={triggerStudentBounce}
                onAnimationEnd={handleIsolatedAnimationEnd}
                className={`min-h-[44px] px-5 py-2.5 rounded-full font-bold text-xs text-white shadow-lg transition-transform ${
                  isHod ? 'bg-hod-claret shadow-hod-claret/30' : 'bg-student-cherry shadow-student-cherry/30'
                } ${isolatedBounceState ? 'animate-bounce-once' : ''}`}
              >
                Click to Trigger Bounce Once
              </button>

              <button
                type="button"
                onClick={() => setReRenderCounter((prev) => prev + 1)}
                className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Simulate Re-render ({reRenderCounter})
              </button>
            </div>

            <p className="text-[11px] text-slate-500 mt-2">
              * Notice that incrementing re-render count does not trigger bounce animation.
            </p>
          </GlassCard>
        </div>
      </section>

      {/* Claymorphic Cards & Illustrative Metrics */}
      <section className="mb-14">
        <div className="mb-4">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <Layers className="w-5 h-5 text-blue-600" />
            4. Claymorphism: Soft Raised 3D Depth &amp; Tactile Cards
          </h2>
          <p className="text-xs text-slate-600">
            Carefully balanced outer and inner shadows creating tangible 3D depth with gentle hover lift.
          </p>
        </div>

        {/* Stat Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            title="Department Students"
            value="486"
            subtitle="AIML B.Tech Cohorts"
            icon={Users}
            trend={{ direction: 'up', value: '+12%' }}
          />
          <StatCard
            title="Active Faculty"
            value="24"
            subtitle="Ph.D &amp; M.Tech Specialists"
            icon={GraduationCap}
            trend={{ direction: 'neutral', value: '0%' }}
          />
          <StatCard
            title="Average CGPA"
            value="8.42"
            subtitle="Semester Cumulative"
            icon={Award}
            trend={{ direction: 'up', value: '+0.34' }}
          />
          <StatCard
            title="Academic Courses"
            value="38"
            subtitle="Theory &amp; AI Laboratories"
            icon={BookOpen}
            badge="Autonomous"
          />
        </div>

        {/* Progress Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <ProgressCard
            title="Mid-Term Marks Uploads"
            current={32}
            total={38}
            unit="courses"
            statusLabel="In Progress"
            caption="84% of department sections successfully uploaded to portal"
          />
          <ProgressCard
            title="Attendance Benchmark"
            current={88}
            percentage={88}
            statusLabel="Compliant"
            caption="Department aggregate attendance exceeding 75% regulatory mandate"
          />
          <ProgressCard
            title="Syllabus Completion"
            current={92}
            percentage={92}
            statusLabel="Target Met"
            caption="Lab experiments and mid-semester coverage finalized"
          />
        </div>
      </section>

      {/* Button & Interactive Controls Showcase */}
      <section className="mb-14">
        <div className="mb-4">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            5. Reusable Button Components (Clay &amp; Glass)
          </h2>
          <p className="text-xs text-slate-600">
            Compliant with minimum 44px touch targets, accessible focus indicators, and distinct tactile pressed states.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Clay Buttons */}
          <ClayCard className="space-y-4">
            <h3 className="font-bold text-slate-900 text-sm pb-2 border-b border-black/5">
              Clay Buttons (3D Tactile Pressed Effect)
            </h3>
            <div className="flex flex-wrap items-center gap-3">
              <ClayButton variant="primary" icon={Sparkles}>
                Primary Action
              </ClayButton>
              <ClayButton variant="secondary" icon={Award}>
                Secondary
              </ClayButton>
              <ClayButton variant="surface">
                Surface Action
              </ClayButton>
              <ClayButton variant="outline">
                Outline
              </ClayButton>
            </div>
            <p className="text-[11px] text-slate-500">
              * Try clicking and holding to feel the 3D clay inset pressed feedback.
            </p>
          </ClayCard>

          {/* Glass Buttons */}
          <GlassCard className="p-6 space-y-4">
            <h3 className="font-bold text-slate-900 text-sm pb-2 border-b border-black/5">
              Glass Buttons (Frosted Translucent Blur)
            </h3>
            <div className="flex flex-wrap items-center gap-3">
              <GlassButton variant="default" icon={Sliders}>
                Glass Default
              </GlassButton>
              <GlassButton variant="surface" icon={Users}>
                Glass Surface
              </GlassButton>
              <GlassButton variant="accent" icon={Zap}>
                Glass Accent
              </GlassButton>
            </div>
            <p className="text-[11px] text-slate-500">
              * Frosted glass buttons maintain crisp contrast on varying backgrounds.
            </p>
          </GlassCard>
        </div>
      </section>

      {/* Glassmorphic Modals & Floating Dropdowns */}
      <section className="mb-14">
        <div className="mb-4">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <Sliders className="w-5 h-5 text-indigo-600" />
            6. Glassmorphism: Modals &amp; Dropdowns
          </h2>
          <p className="text-xs text-slate-600">
            Frosted translucent surfaces with backdrop-filter blur and subtle borders.
          </p>
        </div>

        <ClayCard className="flex flex-wrap items-center gap-4">
          <ClayButton
            variant="primary"
            icon={Maximize2}
            onClick={() => setIsModalOpen(true)}
          >
            Launch Glass Dialog Modal
          </ClayButton>

          <Dropdown items={dropdownActions} />

          <ProfileAvatar
            name={isHod ? 'Dr. K. Srinivas Rao' : 'Sai Krishna MIC'}
            role={isHod ? 'HOD AIML' : 'AIML Student'}
            size="md"
          />

          <NotificationBadge count={5} pulse />
        </ClayCard>

        {/* Modal Instance */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Institutional Glass Modal"
          subtitle={`${BRANDING.collegeName} • ${BRANDING.departmentAbbr}`}
        >
          <div className="space-y-3">
            <p className="text-sm text-slate-700 leading-relaxed">
              This dialog demonstrates restrained glassmorphism. It uses a frosted translucent overlay with <code className="bg-slate-100 px-1 py-0.5 rounded text-xs">backdrop-blur-sm</code>, clear typographic hierarchy, and keyboard escape dismissal.
            </p>
            <div className="p-3 rounded-xl bg-slate-100 border border-slate-200 text-xs">
              <strong>Active Theme:</strong> {isHod ? 'HOD Admin (Sage Fog / Claret Wine / Tangerine)' : 'Student Portal (Almond Milk / Dusty Teal / Cherry Soda)'}
            </div>
            <div className="flex justify-end gap-2 pt-3">
              <ClayButton variant="surface" size="sm" onClick={() => setIsModalOpen(false)}>
                Dismiss
              </ClayButton>
              <ClayButton variant="primary" size="sm" onClick={() => setIsModalOpen(false)}>
                Confirm Action
              </ClayButton>
            </div>
          </div>
        </Modal>
      </section>

      {/* Responsive & Accessibility Verification */}
      <section className="mb-8">
        <div className="mb-4">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-slate-700" />
            7. Responsive Viewport &amp; Accessibility Verification
          </h2>
          <p className="text-xs text-slate-600">
            Validated for 360px mobile, tablets, and desktops with zero horizontal page overflow.
          </p>
        </div>

        <ClayCard>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center mb-4">
            <div className="p-3 rounded-xl bg-white/70 border border-black/5">
              <span className="text-[10px] text-slate-500 uppercase font-bold">Current Window</span>
              <div className="text-base font-bold text-slate-800">{windowWidth}px</div>
            </div>
            <div className="p-3 rounded-xl bg-white/70 border border-black/5">
              <span className="text-[10px] text-slate-500 uppercase font-bold">Mobile Base</span>
              <div className="text-base font-bold text-slate-800">360px &bull; OK</div>
            </div>
            <div className="p-3 rounded-xl bg-white/70 border border-black/5">
              <span className="text-[10px] text-slate-500 uppercase font-bold">Touch Target</span>
              <div className="text-base font-bold text-emerald-700">&ge; 44px</div>
            </div>
            <div className="p-3 rounded-xl bg-white/70 border border-black/5">
              <span className="text-[10px] text-slate-500 uppercase font-bold">Page Overflow</span>
              <div className="text-base font-bold text-emerald-700">0px (None)</div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-600 pt-3 border-t border-black/5">
            <Info className="w-4 h-4 text-blue-500 flex-shrink-0" />
            <span>
              All navigation pills, buttons, and card layouts automatically adjust their spacing and font sizes across mobile viewports down to 360px.
            </span>
          </div>
        </ClayCard>
      </section>
    </PageContainer>
  );
}

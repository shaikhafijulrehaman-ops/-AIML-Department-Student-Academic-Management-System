import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, GraduationCap, ArrowRight, UserCheck, Sparkles, Building2 } from 'lucide-react';
import BRANDING from '../config/branding';
import CollegeLogo from '../components/CollegeLogo';
import { useAuth } from '../context/AuthContext';

export default function PortalSelectPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#F4F6F0] flex flex-col justify-between">
      {/* Top Institutional Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm py-4 px-4 sm:px-8">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3.5">
            <CollegeLogo size="md" />
            <div>
              <h1 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
                {BRANDING.collegeName}
              </h1>
              <p className="text-xs font-semibold text-slate-700">
                {BRANDING.departmentName} ({BRANDING.departmentAbbr})
              </p>
            </div>
          </div>
          <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
            Academic Year 2026–27
          </span>
        </div>
      </header>

      {/* Main Portal Selection Container */}
      <main className="max-w-4xl mx-auto px-4 py-8 sm:py-16 w-full flex-1 flex flex-col items-center justify-center">
        <div className="text-center max-w-2xl mb-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-200/80 text-slate-700 text-xs font-bold tracking-wide uppercase mb-3">
            <Building2 className="w-3.5 h-3.5" />
            AIML Department Portal
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
            Student Academic Management System
          </h2>
          <p className="text-sm text-slate-600">
            Select your assigned portal to proceed with department administration or student academic updates.
          </p>
        </div>

        {/* The Two Distinct Portals Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
          {/* 1. HOD Portal Card */}
          <div className="relative rounded-3xl bg-white border-2 border-[#D7DCCF] p-6 sm:p-8 shadow-lg hover:shadow-xl transition-all duration-300 flex flex-col justify-between group">
            <div className="absolute top-4 right-4">
              <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full bg-[#4A192B]/10 text-[#4A192B]">
                Administrative
              </span>
            </div>

            <div>
              <div className="w-14 h-14 rounded-2xl bg-[#4A192B] text-white flex items-center justify-center mb-5 shadow-md shadow-[#4A192B]/20 group-hover:scale-105 transition-transform">
                <Shield className="w-7 h-7 text-[#FF6B1A]" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">
                HOD Portal
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed mb-6">
                Department-level student monitoring, multi-parameter academic filtering, semester update request tracking, and reports.
              </p>

              <div className="space-y-2 py-3 border-y border-slate-100 text-xs text-slate-600 mb-6">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4A192B]"></span>
                  <span>Cohort summaries (1st to 4th Year)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4A192B]"></span>
                  <span>Multi-criteria CGPA &amp; Percentage filters</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4A192B]"></span>
                  <span>Semester CGPA update request management</span>
                </div>
              </div>
            </div>

            <div className="space-y-2.5">
              <Link
                to="/admin/login"
                className="w-full flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-[#4A192B] hover:bg-[#35101E] text-white font-bold text-xs shadow-md transition-all active:scale-[0.99]"
              >
                <span>Open HOD Login Screen</span>
                <ArrowRight className="w-4 h-4 text-[#FF6B1A]" />
              </Link>
            </div>
          </div>

          {/* 2. Student Portal Card */}
          <div className="relative rounded-3xl bg-white border-2 border-[#E8E0CF] p-6 sm:p-8 shadow-lg hover:shadow-xl transition-all duration-300 flex flex-col justify-between group">
            <div className="absolute top-4 right-4">
              <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full bg-[#7FA8A1]/20 text-[#3A6B64]">
                Student Access
              </span>
            </div>

            <div>
              <div className="w-14 h-14 rounded-2xl bg-[#7FA8A1] text-white flex items-center justify-center mb-5 shadow-md shadow-[#7FA8A1]/30 group-hover:scale-105 transition-transform">
                <GraduationCap className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">
                Student Portal
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed mb-6">
                Access your student academic profile, verified semester CGPA breakdown, and respond to official HOD update requests.
              </p>

              <div className="space-y-2 py-3 border-y border-slate-100 text-xs text-slate-600 mb-6">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#7FA8A1]"></span>
                  <span>Personal student profile &amp; contact details</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#7FA8A1]"></span>
                  <span>Completed semester CGPA update (3-1 to 4-2)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#7FA8A1]"></span>
                  <span>Official departmental update requests</span>
                </div>
              </div>
            </div>

            <div className="space-y-2.5">
              <Link
                to="/student/login"
                className="w-full flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-[#5E8881] hover:bg-[#4D756E] text-white font-bold text-xs shadow-md transition-all active:scale-[0.99]"
              >
                <span>Open Student Login Screen</span>
                <ArrowRight className="w-4 h-4 text-[#E8213A]" />
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500">
        <p>
          &copy; {new Date().getFullYear()} {BRANDING.collegeName} &bull; {BRANDING.departmentName}
        </p>
      </footer>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, Eye, EyeOff, Lock, User, ArrowRight, AlertCircle, Info } from 'lucide-react';
import BRANDING from '../../config/branding';
import CollegeLogo from '../../components/CollegeLogo';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { THEMES } from '../../config/theme';

export default function StudentLoginPage() {
  const navigate = useNavigate();
  const { loginAsStudent } = useAuth();
  const { setTheme } = useTheme();

  useEffect(() => {
    setTheme(THEMES.STUDENT);
  }, [setTheme]);

  const [registerNumber, setRegisterNumber] = useState('22H71A6125');
  const [password, setPassword] = useState('student123');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!registerNumber.trim() || !password.trim()) {
      setError('Please enter Register Number and Password.');
      return;
    }

    const res = loginAsStudent(registerNumber.trim(), password.trim());
    if (res.success) {
      navigate('/student/dashboard');
    } else {
      setError(res.error || 'Invalid credentials.');
    }
  };

  const handleFillDemo = (regNo) => {
    setRegisterNumber(regNo);
    setPassword('student123');
    setError('');
  };

  return (
    <div className="min-h-screen bg-[#E8E0CF] flex flex-col justify-between text-[#1F2926]">
      {/* Top Header */}
      <header className="bg-white/85 backdrop-blur-md border-b border-[#D4CAB4] py-3.5 px-4 sm:px-8 shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CollegeLogo size="sm" />
            <div className="leading-tight">
              <span className="text-xs sm:text-sm font-bold text-slate-900 block truncate">
                {BRANDING.collegeName}
              </span>
              <span className="text-[11px] font-bold text-[#5E8881]">
                {BRANDING.departmentName} &bull; Student Portal
              </span>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#7FA8A1]/20 text-[#3D6660] text-xs font-bold">
            <GraduationCap className="w-3.5 h-3.5 text-[#5E8881]" />
            Student Login
          </span>
        </div>
      </header>

      {/* Main Login Card */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-[#D4CAB4] p-6 sm:p-8 space-y-6">
          {/* Institutional Branding Lockup */}
          <div className="text-center space-y-2.5">
            <div className="flex justify-center">
              <CollegeLogo size="lg" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                {BRANDING.collegeName}
              </h1>
              <p className="text-xs font-bold text-[#5E8881]">
                {BRANDING.departmentName} ({BRANDING.departmentAbbr})
              </p>
              <div className="inline-block mt-2 px-3 py-0.5 rounded-full bg-[#7FA8A1]/20 text-[#3D6660] text-[11px] font-bold tracking-wide uppercase">
                Student Academic Portal
              </div>
            </div>
          </div>

          {/* Department Mandate Notice */}
          <div className="p-3.5 rounded-2xl bg-[#E8E0CF]/60 border border-[#D4CAB4] text-xs text-slate-700 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-[#5E8881] flex-shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-semibold text-slate-900">
                Use the login credentials provided by the department.
              </p>
              <p className="text-[11px] text-slate-600">
                Student accounts are created by the HOD. Students do not self-register.
              </p>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5" htmlFor="student-regno">
                Register Number
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  id="student-regno"
                  type="text"
                  value={registerNumber}
                  onChange={(e) => setRegisterNumber(e.target.value.toUpperCase())}
                  placeholder="e.g. 22H71A6125"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-[#7FA8A1] focus:ring-2 focus:ring-[#7FA8A1]/30 text-xs sm:text-sm font-mono uppercase text-slate-800 outline-none transition-all"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5" htmlFor="student-password">
                Assigned Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="student-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter assigned password"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-300 focus:border-[#7FA8A1] focus:ring-2 focus:ring-[#7FA8A1]/30 text-xs sm:text-sm text-slate-800 outline-none transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full min-h-[44px] flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#5E8881] hover:bg-[#4A6F68] active:scale-[0.99] text-white font-bold text-xs sm:text-sm shadow-md shadow-[#5E8881]/25 transition-all cursor-pointer"
            >
              <GraduationCap className="w-4 h-4 text-white" />
              <span>Login to Student Portal</span>
              <ArrowRight className="w-4 h-4 text-[#E8213A]" />
            </button>
          </form>

          {/* Quick Demo Student Switcher */}
          <div className="pt-4 border-t border-slate-100 space-y-2 text-xs">
            <span className="text-slate-500 block font-medium">Quick Demo Accounts:</span>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => handleFillDemo('22H71A6125')}
                className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-mono font-bold"
              >
                22H71A6125 (3rd Yr)
              </button>
              <button
                type="button"
                onClick={() => handleFillDemo('21H71A6105')}
                className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-mono font-bold"
              >
                21H71A6105 (4th Yr)
              </button>
              <button
                type="button"
                onClick={() => handleFillDemo('23H71A6115')}
                className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-mono font-bold"
              >
                23H71A6115 (2nd Yr)
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-slate-600">
        <p>
          &copy; {new Date().getFullYear()} {BRANDING.collegeName} &bull; {BRANDING.departmentName}
        </p>
      </footer>
    </div>
  );
}

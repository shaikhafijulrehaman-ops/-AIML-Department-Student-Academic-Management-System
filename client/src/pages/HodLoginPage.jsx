import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Shield, Eye, EyeOff, Lock, Mail, ArrowRight, ArrowLeft, AlertCircle } from 'lucide-react';
import BRANDING from '../config/branding';
import CollegeLogo from '../components/CollegeLogo';
import { useAuth } from '../context/AuthContext';

export default function HodLoginPage() {
  const navigate = useNavigate();
  const { loginAsHod } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Please enter HOD Login ID or Email.');
      return;
    }
    if (!password.trim()) {
      setError('Please enter Password.');
      return;
    }

    setIsSubmitting(true);
    const res = await loginAsHod(email.trim(), password.trim());
    setIsSubmitting(false);
    if (res.success) {
      navigate('/admin/dashboard');
    } else {
      setError(res.error || 'Invalid credentials.');
    }
  };

  return (
    <div className="min-h-screen bg-[#D7DCCF] flex flex-col justify-between text-[#1E231D]">
      {/* Top Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-[#C1C8B7] py-3.5 px-4 sm:px-8 shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#4A192B] hover:text-[#35101E] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Select Portal</span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#FF6B1A]"></span>
            <span className="text-xs font-bold text-[#4A192B]">HOD Portal Access</span>
          </div>
        </div>
      </header>

      {/* Main Login Card */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-[#C1C8B7] p-6 sm:p-8 space-y-6">
          {/* Institutional Branding Lockup */}
          <div className="text-center space-y-3">
            <div className="flex justify-center">
              <CollegeLogo size="lg" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                {BRANDING.collegeName}
              </h1>
              <p className="text-xs font-bold text-[#4A192B] mt-0.5">
                {BRANDING.departmentName}
              </p>
              <div className="inline-block mt-2 px-3 py-0.5 rounded-full bg-[#4A192B]/10 text-[#4A192B] text-[11px] font-bold tracking-wide uppercase">
                HOD Administrative Login
              </div>
            </div>
          </div>

          {/* Error Notice */}
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5" htmlFor="hod-email">
                HOD Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="hod-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  autoComplete="username"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-[#4A192B] focus:ring-2 focus:ring-[#4A192B]/20 text-xs sm:text-sm text-slate-800 outline-none transition-all"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5" htmlFor="hod-password">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="hod-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your administrative password"
                  autoComplete="current-password"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-300 focus:border-[#4A192B] focus:ring-2 focus:ring-[#4A192B]/20 text-xs sm:text-sm text-slate-800 outline-none transition-all"
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
              disabled={isSubmitting}
              className="w-full min-h-[44px] flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#4A192B] hover:bg-[#35101E] active:scale-[0.99] text-white font-bold text-xs sm:text-sm shadow-md shadow-[#4A192B]/20 transition-all cursor-pointer disabled:opacity-60"
            >
              <Shield className="w-4 h-4 text-[#FF6B1A]" />
              <span>{isSubmitting ? 'Authenticating...' : 'Login to HOD Portal'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
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

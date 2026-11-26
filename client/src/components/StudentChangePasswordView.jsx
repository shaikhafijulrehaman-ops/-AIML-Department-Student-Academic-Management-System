import React, { useState } from 'react';
import { Lock, Key, AlertCircle, Eye, EyeOff, ShieldCheck, ArrowRight } from 'lucide-react';
import CollegeLogo from './CollegeLogo';
import BRANDING from '../config/branding';

/**
 * StudentChangePasswordView
 * Mandatory first-login screen when HOD creates initial account credentials.
 * The student must change their initial password before accessing profile completion.
 */
export default function StudentChangePasswordView({ student, onPasswordChanged, onLogout }) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    const p1 = newPassword.trim();
    const p2 = confirmPassword.trim();

    if (!p1) {
      setError('New Password is required.');
      return;
    }
    if (p1.length < 4) {
      setError('Password must be at least 4 characters.');
      return;
    }
    if (!p2) {
      setError('Please confirm your new password.');
      return;
    }
    if (p1 !== p2) {
      setError('Passwords do not match. Please verify.');
      return;
    }

    setIsSubmitting(true);
    Promise.resolve(onPasswordChanged(p1)).then((res) => {
      if (!res || !res.success) {
        setIsSubmitting(false);
        setError(res?.error || 'Failed to update password. Please try again.');
      }
    }).catch((err) => {
      setIsSubmitting(false);
      setError(err?.message || 'Failed to update password.');
    });
  };

  return (
    <div className="min-h-screen bg-[#E8E0CF] text-[#1F2926] flex flex-col justify-between p-4 sm:p-6">
      {/* Header */}
      <header className="max-w-md mx-auto w-full flex items-center justify-between pb-4">
        <div className="flex items-center gap-2.5">
          <CollegeLogo size="sm" />
          <div className="leading-tight">
            <span className="text-xs font-bold text-slate-900 block truncate">
              {BRANDING.collegeName}
            </span>
            <span className="text-[10px] font-bold text-[#5E8881]">
              {BRANDING.departmentName} &bull; Security Setup
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={onLogout}
          className="text-xs font-bold text-slate-600 hover:text-rose-700 underline cursor-pointer"
        >
          Logout
        </button>
      </header>

      {/* Main Card */}
      <main className="max-w-md mx-auto w-full bg-white rounded-3xl shadow-xl border border-[#D4CAB4] p-6 sm:p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-[#5E8881]/15 text-[#5E8881] mx-auto flex items-center justify-center shadow-xs">
            <ShieldCheck className="w-7 h-7 text-[#E8213A]" />
          </div>
          <h2 className="text-lg font-black text-slate-900 leading-tight">
            First Login: Set Secure Password
          </h2>
          <p className="text-xs text-slate-600">
            Welcome to the AIML Academic Portal. Please set a new personal password for your student account.
          </p>
          <div className="inline-block mt-1 px-3 py-1 rounded-full bg-slate-100 font-mono text-xs font-bold text-[#5E8881] border border-slate-200">
            Roll No: {student.registerNumber}
          </div>
        </div>

        {/* Notice */}
        <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200/80 text-xs text-amber-900 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <p className="text-[11px] text-amber-800 leading-tight">
            For security, your initial temporary password provided by HOD must be changed before accessing your student dashboard.
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* New Password */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5" htmlFor="first-login-pass">
              New Password <span className="text-rose-600">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                id="first-login-pass"
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  setError('');
                }}
                placeholder="Enter new password (min. 4 characters)..."
                className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-slate-300 bg-white text-xs font-medium text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-[#5E8881]/20 focus:border-[#5E8881] transition-all"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm New Password */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5" htmlFor="first-login-confirm">
              Confirm New Password <span className="text-rose-600">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Key className="w-4 h-4" />
              </div>
              <input
                id="first-login-confirm"
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setError('');
                }}
                placeholder="Re-enter new password..."
                className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-slate-300 bg-white text-xs font-medium text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-[#5E8881]/20 focus:border-[#5E8881] transition-all"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 px-4 rounded-xl bg-[#5E8881] hover:bg-[#48706A] active:scale-[0.99] text-white font-bold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <span>{isSubmitting ? 'Updating Password...' : 'Save Password & Continue to Profile'}</span>
            <ArrowRight className="w-4 h-4 text-[#E8213A]" />
          </button>
        </form>
      </main>

      {/* Footer */}
      <footer className="text-center text-[11px] text-slate-500 py-4">
        &copy; {new Date().getFullYear()} {BRANDING.collegeName} &bull; {BRANDING.departmentName}
      </footer>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { X, UserPlus, Lock, Key, AlertCircle, CheckCircle2, Eye, EyeOff, ShieldCheck } from 'lucide-react';

/**
 * CreateStudentModal
 * HOD creates student initial account credentials ONLY.
 * Strict departmental requirement:
 * Form contains ONLY TWO FIELDS:
 * 1. Register Number
 * 2. Initial Password
 * Students themselves complete all personal and academic details on first login.
 */
export default function CreateStudentModal({ isOpen, onClose, onCreateStudent }) {
  const [registerNumber, setRegisterNumber] = useState('');
  const [initialPassword, setInitialPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setRegisterNumber('');
      setInitialPassword('');
      setError('');
      setShowPassword(false);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    const cleanRegNo = registerNumber.trim().toUpperCase();
    const cleanPassword = initialPassword.trim();

    if (!cleanRegNo) {
      setError('Register Number is mandatory.');
      return;
    }
    if (!cleanPassword) {
      setError('Initial Password is mandatory.');
      return;
    }
    if (cleanPassword.length < 4) {
      setError('Initial Password must be at least 4 characters.');
      return;
    }

    setIsSubmitting(true);
    const result = onCreateStudent({
      registerNumber: cleanRegNo,
      initialPassword: cleanPassword
    });

    if (result && result.success) {
      onClose();
    } else {
      setIsSubmitting(false);
      setError(result?.error || 'Failed to create student account.');
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-[#C1C8B7] overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[#4A192B] text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#FF6B1A] text-white flex items-center justify-center shadow-xs">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Create Student Account</h3>
              <p className="text-[11px] text-[#D7DCCF]">
                DVR &amp; Dr. HS MIC College of Technology &bull; AIML
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notice */}
        <div className="p-4 bg-amber-50 border-b border-amber-200/80 text-xs text-amber-900 flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div className="space-y-0.5 leading-tight">
            <p className="font-bold">HOD Credentials Creation Only</p>
            <p className="text-[11px] text-amber-800">
              Provide only the student's Register Number and Initial Password. Students will log in, change their password, and complete their own personal and academic profiles.
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Field 1: Register Number */}
          <div>
            <label htmlFor="modal-reg-no" className="block text-xs font-bold text-slate-700 mb-1.5">
              Register Number (Roll Number) <span className="text-rose-600">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Key className="w-4 h-4" />
              </div>
              <input
                id="modal-reg-no"
                type="text"
                value={registerNumber}
                onChange={(e) => {
                  setRegisterNumber(e.target.value);
                  setError('');
                }}
                placeholder="e.g. 23H71A6199"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 bg-white font-mono font-bold text-xs uppercase text-[#4A192B] placeholder:text-slate-400 placeholder:font-sans placeholder:font-normal outline-none focus:ring-2 focus:ring-[#4A192B]/20 focus:border-[#4A192B] transition-all"
                autoFocus
              />
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block">
              Unique institutional hall ticket number.
            </span>
          </div>

          {/* Field 2: Initial Password */}
          <div>
            <label htmlFor="modal-init-pass" className="block text-xs font-bold text-slate-700 mb-1.5">
              Initial Password <span className="text-rose-600">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                id="modal-init-pass"
                type={showPassword ? 'text' : 'password'}
                value={initialPassword}
                onChange={(e) => {
                  setInitialPassword(e.target.value);
                  setError('');
                }}
                placeholder="Temporary initial password..."
                className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-slate-300 bg-white text-xs font-medium text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-[#4A192B]/20 focus:border-[#4A192B] transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block">
              Student will be forced to change this on their first login.
            </span>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-[#4A192B] hover:bg-[#35101E] active:scale-95 text-white font-bold text-xs shadow-md transition-all cursor-pointer flex items-center gap-2"
            >
              <UserPlus className="w-4 h-4 text-[#FF6B1A]" />
              <span>{isSubmitting ? 'Creating...' : 'Create Account'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

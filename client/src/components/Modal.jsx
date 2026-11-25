import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import GlassCard from './GlassCard';

/**
 * Modal Component
 * Accessible dialog with frosted glass backdrop blur overlay.
 */
export const Modal = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'max-w-lg',
  className = '',
}) => {
  const { isHod } = useTheme();

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose?.();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      {/* Frosted Glass Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog Card */}
      <GlassCard
        variant="modal"
        rounded="3xl"
        className={`relative w-full ${maxWidth} p-6 sm:p-8 z-10 shadow-2xl ${className}`}
      >
        <div className="flex items-start justify-between gap-4 mb-5 pb-3 border-b border-slate-200/60">
          <div>
            <h3
              id="modal-title"
              className="text-lg sm:text-xl font-bold tracking-tight text-slate-900"
            >
              {title}
            </h3>
            {subtitle && (
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors focus-visible:outline-none focus-visible:ring-2 ${
              isHod ? 'focus-visible:ring-hod-tangerine' : 'focus-visible:ring-student-cherry'
            }`}
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 text-sm text-slate-700">
          {children}
        </div>
      </GlassCard>
    </div>
  );
};

export default Modal;

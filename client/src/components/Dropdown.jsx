import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import GlassCard from './GlassCard';

/**
 * Dropdown Component
 * Floating glass menu with smooth hover illumination and keyboard accessibility.
 */
export const Dropdown = ({
  trigger,
  items = [], // Array of { label, icon: Icon, onClick, danger, disabled }
  align = 'right', // 'left' | 'right'
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const { isHod } = useTheme();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const alignClasses = {
    left: 'left-0',
    right: 'right-0',
  };

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      <div onClick={() => setIsOpen((prev) => !prev)}>
        {trigger ? (
          trigger({ isOpen })
        ) : (
          <button
            type="button"
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold backdrop-blur-md border border-white/50 shadow-sm transition-all ${
              isHod
                ? 'bg-white/70 hover:bg-white text-hod-text'
                : 'bg-white/70 hover:bg-white text-student-text'
            }`}
            aria-expanded={isOpen}
          >
            <span>Options</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
          </button>
        )}
      </div>

      {isOpen && (
        <GlassCard
          rounded="xl"
          blur="lg"
          variant="modal"
          className={`absolute ${alignClasses[align] || 'right-0'} mt-2 w-56 p-1.5 z-40 shadow-xl border border-white/60 animate-in fade-in zoom-in-95 duration-150`}
        >
          <div className="py-1" role="menu">
            {items.map((item, index) => {
              const Icon = item.icon;
              return (
                <button
                  key={index}
                  role="menuitem"
                  disabled={item.disabled}
                  onClick={() => {
                    item.onClick?.();
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-lg text-left transition-colors min-h-[40px] ${
                    item.danger
                      ? 'text-rose-600 hover:bg-rose-50'
                      : isHod
                      ? 'text-slate-800 hover:bg-hod-claret/10 hover:text-hod-claret'
                      : 'text-slate-800 hover:bg-student-teal/15 hover:text-student-teal-dark'
                  } disabled:opacity-40 disabled:pointer-events-none`}
                >
                  {Icon && <Icon className="w-4 h-4 flex-shrink-0" />}
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </div>
        </GlassCard>
      )}
    </div>
  );
};

export default Dropdown;

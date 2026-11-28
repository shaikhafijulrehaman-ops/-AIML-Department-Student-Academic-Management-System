import React from 'react';
import BRANDING from '../config/branding';
import { useTheme } from '../context/ThemeContext';
import CollegeLogo from './CollegeLogo';

/**
 * CollegeBrandHeader Component
 * Shared Institutional branding lockup:
 * [Official College Logo] [College Name (Prominent) + Department Subtitle (Underneath)] ... [Portal Badge (Right)]
 *
 * Fully responsive down to 320px mobile viewports:
 * - Prevents text wrapping or horizontal overflow
 * - Enforces strong typography hierarchy: Prominent College Title + Subdued Department Subtitle
 * - Keeps right badge aligned and atomic (never wraps onto multiple lines)
 * - Adapts to HOD and Student theme palettes
 */
export const CollegeBrandHeader = ({
  className = '',
  compact = false,
  showTagline = false,
  subtitle,
  badgeText,
  badgeIcon: BadgeIcon,
  rightSlot,
  variant, // 'student' | 'hod' | auto
}) => {
  const { isHod: themeIsHod } = useTheme();
  const isHod = variant === 'hod' ? true : variant === 'student' ? false : themeIsHod;

  const defaultSubtitle = subtitle || `${BRANDING.departmentName} • ${isHod ? 'Admin Portal' : 'Student Portal'}`;

  return (
    <div className={`flex items-center justify-between gap-2 sm:gap-4 w-full max-w-full min-w-0 ${className}`}>
      {/* Brand Lockup: Logo + Institutional Titles */}
      <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0 flex-1">
        <CollegeLogo 
          size={compact ? 'sm' : 'sm'} 
          variant={isHod ? 'claret' : 'teal'}
          className="shrink-0 flex-shrink-0"
        />
        <div className="flex flex-col min-w-0 justify-center">
          {/* Prominent College Title with strong visual hierarchy */}
          <h1 
            className="font-extrabold tracking-tight text-slate-900 leading-tight text-xs sm:text-base md:text-lg truncate"
            title={BRANDING.collegeName}
          >
            {BRANDING.collegeName}
          </h1>
          
          {/* Subtitle underneath in smaller, well-balanced typography */}
          <div className="flex items-center gap-1.5 min-w-0 mt-0.5">
            <p 
              className={`font-semibold tracking-normal text-[10px] sm:text-xs leading-tight truncate ${
                isHod 
                  ? 'text-[#4A192B]' 
                  : 'text-[#5E8881]'
              }`}
              title={defaultSubtitle}
            >
              {defaultSubtitle}
            </p>
          </div>

          {showTagline && (
            <p className="text-[10px] text-slate-500 hidden md:block mt-0.5 font-medium truncate">
              {BRANDING.tagline}
            </p>
          )}
        </div>
      </div>

      {/* Right Slot / Portal Badge */}
      {(rightSlot || badgeText) && (
        <div className="shrink-0 flex-shrink-0 flex items-center ml-1 sm:ml-2">
          {rightSlot || (
            <span 
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] sm:text-xs font-bold shrink-0 whitespace-nowrap select-none shadow-xs ${
                isHod
                  ? 'bg-[#4A192B]/10 text-[#4A192B]'
                  : 'bg-[#7FA8A1]/20 text-[#3D6660]'
              }`}
            >
              {BadgeIcon && (
                <BadgeIcon className={`w-3.5 h-3.5 shrink-0 ${isHod ? 'text-[#FF6B1A]' : 'text-[#5E8881]'}`} />
              )}
              <span>{badgeText}</span>
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default CollegeBrandHeader;

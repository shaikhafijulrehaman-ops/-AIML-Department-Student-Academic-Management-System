import React from 'react';
import BRANDING from '../config/branding';
import { useTheme } from '../context/ThemeContext';
import CollegeLogo from './CollegeLogo';

/**
 * CollegeBrandHeader Component
 * Institutional branding lockup: Logo + College Name + Department Name + AIML Abbreviation
 * Adapts to HOD and Student theme palettes with responsive typography down to 360px.
 */
export const CollegeBrandHeader = ({
  className = '',
  compact = false,
  showTagline = false,
}) => {
  const { isHod } = useTheme();

  return (
    <div className={`flex items-center gap-3 sm:gap-4 max-w-full ${className}`}>
      <CollegeLogo 
        size={compact ? 'sm' : 'md'} 
        variant={isHod ? 'claret' : 'teal'}
      />
      <div className="flex flex-col min-w-0">
        <h1 
          className={`font-bold tracking-tight truncate leading-tight ${
            compact 
              ? 'text-xs sm:text-sm text-slate-800' 
              : 'text-sm sm:text-base md:text-lg text-slate-900'
          }`}
          title={BRANDING.collegeName}
        >
          {BRANDING.collegeName}
        </h1>
        
        <div className="flex items-center gap-1.5 flex-wrap">
          <p 
            className={`font-semibold tracking-wide truncate leading-tight ${
              compact 
                ? 'text-[11px] sm:text-xs' 
                : 'text-xs sm:text-sm'
            } ${
              isHod 
                ? 'text-hod-claret' 
                : 'text-student-teal-dark'
            }`}
          >
            {BRANDING.departmentName}
          </p>
          <span 
            className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wider ${
              isHod 
                ? 'bg-hod-claret text-white shadow-sm' 
                : 'bg-student-teal text-white shadow-sm'
            }`}
          >
            {BRANDING.departmentAbbr}
          </span>
        </div>

        {showTagline && (
          <p className="text-[10px] text-slate-500 hidden md:block mt-0.5 font-medium">
            {BRANDING.tagline}
          </p>
        )}
      </div>
    </div>
  );
};

export default CollegeBrandHeader;

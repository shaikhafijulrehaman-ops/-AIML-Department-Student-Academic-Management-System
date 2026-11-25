import React, { useState } from 'react';
import BRANDING from '../config/branding';

/**
 * CollegeLogo Component
 *
 * Implements institutional branding guidelines for DVR & Dr. HS MIC College of Technology.
 * - Renders official asset from `client/public/assets/branding/college-logo.png` (with background removed)
 * - Seamlessly displays directly against website UI backgrounds (Sage Fog, Almond Milk, etc.)
 * - Provides surface-adaptive contrast (e.g. frosted badge on dark navigation capsules)
 * - Falls back to graceful accessible institutional placeholder if image fails to load
 */
export const CollegeLogo = ({
  size = 'md', // 'sm' | 'md' | 'lg' | 'xl'
  className = '',
  variant = 'default', // 'default' | 'claret' | 'teal' | 'on-dark' | 'transparent'
  badge = false, // When true, places on a subtle frosted badge for dark navigation bars
}) => {
  const [imageError, setImageError] = useState(false);

  // Height and responsive scaling preserving logo aspect ratio (299x196)
  const sizeClasses = {
    sm: 'h-7 sm:h-8 w-auto max-w-[52px]',
    md: 'h-9 sm:h-10 w-auto max-w-[68px]',
    lg: 'h-12 sm:h-14 w-auto max-w-[95px]',
    xl: 'h-16 sm:h-20 w-auto max-w-[130px]',
  };

  const placeholderSizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-xl',
  };

  // When badge is active (ideal for dark Claret Wine or Dusty Teal navigation capsules)
  const badgeClasses = badge || variant === 'on-dark'
    ? 'bg-white/95 p-1 rounded-xl shadow-sm ring-1 ring-white/50 backdrop-blur-sm'
    : '';

  if (!imageError && BRANDING.logoPath) {
    return (
      <div 
        className={`relative inline-flex items-center justify-center flex-shrink-0 transition-transform ${badgeClasses} ${className}`}
        title={`${BRANDING.collegeName} Official Emblem`}
      >
        <img
          src={BRANDING.logoPath}
          alt={`${BRANDING.collegeName} Official Logo`}
          className={`${sizeClasses[size]} object-contain drop-shadow-sm select-none`}
          onError={() => setImageError(true)}
        />
      </div>
    );
  }

  // Graceful fallback placeholder
  return (
    <div
      title={`${BRANDING.collegeName} Emblem`}
      className={`relative inline-flex flex-col items-center justify-center font-bold text-white rounded-xl bg-gradient-to-br from-hod-claret to-hod-claret-dark shadow-md select-none flex-shrink-0 ${placeholderSizeClasses[size]} ${className}`}
      role="img"
      aria-label={`${BRANDING.collegeName} Emblem Placeholder`}
    >
      <span className="leading-none tracking-tight font-extrabold text-[0.8em]">MIC</span>
      <span className="text-[0.45em] uppercase tracking-widest font-semibold opacity-90">TECH</span>
    </div>
  );
};

export default CollegeLogo;

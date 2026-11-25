import React from 'react';
import { useTheme } from '../context/ThemeContext';

/**
 * GlassCard Component
 * Frosted translucent container with backdrop blur, restrained opacity, and subtle borders.
 * Primarily used for floating navigation, floating panels, dropdowns, and modals.
 */
export const GlassCard = ({
  children,
  className = '',
  variant = 'default', // 'default' | 'surface' | 'tinted' | 'modal'
  blur = 'md', // 'sm' | 'md' | 'lg'
  rounded = '2xl', // 'xl' | '2xl' | '3xl' | 'full'
  onClick,
  ...props
}) => {
  const { isHod } = useTheme();

  const blurClasses = {
    sm: 'backdrop-blur-sm',
    md: 'backdrop-blur-md',
    lg: 'backdrop-blur-lg',
  };

  const roundedClasses = {
    xl: 'rounded-xl',
    '2xl': 'rounded-2xl',
    '3xl': 'rounded-3xl',
    full: 'rounded-full',
  };

  // Restrained glass variants to maintain high contrast readability
  const variantStyles = {
    default: isHod
      ? 'bg-white/70 border-white/50 text-slate-800 shadow-glass'
      : 'bg-white/75 border-white/60 text-slate-900 shadow-glass',
    surface: isHod
      ? 'bg-hod-claret/90 border-white/20 text-white shadow-xl shadow-hod-claret/15'
      : 'bg-student-teal/90 border-white/30 text-white shadow-xl shadow-student-teal/20',
    tinted: isHod
      ? 'bg-hod-sage/80 border-hod-claret/15 text-hod-text shadow-sm'
      : 'bg-student-almond/80 border-student-teal/20 text-student-text shadow-sm',
    modal: isHod
      ? 'bg-white/92 border-white/60 text-slate-900 shadow-2xl'
      : 'bg-white/95 border-white/70 text-slate-900 shadow-2xl',
  };

  return (
    <div
      className={`
        border
        ${blurClasses[blur] || blurClasses.md}
        ${roundedClasses[rounded] || roundedClasses['2xl']}
        ${variantStyles[variant] || variantStyles.default}
        transition-all duration-200
        ${className}
      `}
      onClick={onClick}
      {...props}
    >
      {children}
    </div>
  );
};

export default GlassCard;

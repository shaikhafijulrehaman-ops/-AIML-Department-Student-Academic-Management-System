import React from 'react';
import { useTheme } from '../context/ThemeContext';

/**
 * ClayCard Component
 * Soft raised 3D surface with balanced inner and outer shadows.
 * Strictly avoids heavy glass blur; used for statistic cards, profile cards, and academic cards.
 */
export const ClayCard = ({
  children,
  className = '',
  interactive = false,
  rounded = '2xl', // 'xl' | '2xl' | '3xl'
  padding = 'p-6',
  surface = 'light', // 'light' | 'primary' | 'accent'
  onClick,
  ...props
}) => {
  const { isHod } = useTheme();

  const roundedClasses = {
    xl: 'rounded-xl',
    '2xl': 'rounded-2xl',
    '3xl': 'rounded-3xl',
  };

  // Clay styling by theme and surface variant
  const surfaceStyles = {
    light: isHod
      ? 'bg-[#E3E8DC] text-hod-text border border-white/60'
      : 'bg-[#F2ECE0] text-student-text border border-white/70',
    primary: isHod
      ? 'bg-hod-claret text-white border border-white/10'
      : 'bg-student-teal text-white border border-white/20',
    accent: isHod
      ? 'bg-hod-tangerine text-white border border-white/20'
      : 'bg-student-cherry text-white border border-white/20',
  };

  const interactiveClasses = interactive
    ? 'cursor-pointer clay-surface active:scale-[0.99]'
    : 'clay-surface';

  return (
    <div
      className={`
        ${roundedClasses[rounded] || roundedClasses['2xl']}
        ${surfaceStyles[surface] || surfaceStyles.light}
        ${interactiveClasses}
        ${padding}
        ${className}
      `}
      onClick={onClick}
      {...props}
    >
      {children}
    </div>
  );
};

export default ClayCard;

import React from 'react';
import { useTheme } from '../context/ThemeContext';

/**
 * ClayButton Component
 * Tactile 3D clay-styled action button with smooth hover lift and soft pressed state.
 * Meets WCAG minimum 44px touch target guidelines.
 */
export const ClayButton = ({
  children,
  variant = 'primary', // 'primary' | 'secondary' | 'surface' | 'outline'
  size = 'md', // 'sm' | 'md' | 'lg'
  icon: Icon,
  iconPosition = 'left',
  className = '',
  disabled = false,
  onClick,
  type = 'button',
  ...props
}) => {
  const { isHod } = useTheme();

  // Enforce minimum 44px touch target for accessibility
  const sizeClasses = {
    sm: 'min-h-[44px] px-3.5 py-2 text-xs font-semibold rounded-xl gap-1.5',
    md: 'min-h-[44px] px-5 py-2.5 text-sm font-semibold rounded-xl gap-2',
    lg: 'min-h-[48px] px-6 py-3 text-base font-bold rounded-2xl gap-2.5',
  };

  // Color mappings adhering strictly to non-mixing theme rules
  const variantStyles = {
    primary: isHod
      ? 'bg-hod-tangerine hover:bg-hod-tangerine-hover text-white shadow-lg shadow-hod-tangerine/25 border-t border-white/30'
      : 'bg-student-cherry hover:bg-student-cherry-hover text-white shadow-lg shadow-student-cherry/25 border-t border-white/30',
    secondary: isHod
      ? 'bg-hod-claret hover:bg-hod-claret-light text-white shadow-md shadow-hod-claret/20 border-t border-white/20'
      : 'bg-student-teal hover:bg-student-teal-dark text-white shadow-md shadow-student-teal/20 border-t border-white/30',
    surface: isHod
      ? 'bg-[#DEE3D7] hover:bg-[#D3DAC9] text-hod-text border border-white/80'
      : 'bg-[#EDE5D4] hover:bg-[#E3D9C3] text-student-text border border-white/80',
    outline: isHod
      ? 'bg-transparent border-2 border-hod-claret text-hod-claret hover:bg-hod-claret/10'
      : 'bg-transparent border-2 border-student-teal-dark text-student-teal-dark hover:bg-student-teal/15',
  };

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`
        inline-flex items-center justify-center
        clay-button-base
        font-medium
        select-none
        cursor-pointer
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
        ${isHod ? 'focus-visible:ring-hod-tangerine' : 'focus-visible:ring-student-cherry'}
        disabled:opacity-50 disabled:pointer-events-none disabled:shadow-none
        ${sizeClasses[size] || sizeClasses.md}
        ${variantStyles[variant] || variantStyles.primary}
        ${className}
      `}
      {...props}
    >
      {Icon && iconPosition === 'left' && <Icon className="w-4 h-4 flex-shrink-0" />}
      <span>{children}</span>
      {Icon && iconPosition === 'right' && <Icon className="w-4 h-4 flex-shrink-0" />}
    </button>
  );
};

export default ClayButton;

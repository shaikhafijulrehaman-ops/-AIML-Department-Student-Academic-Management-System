import React from 'react';
import { useTheme } from '../context/ThemeContext';

/**
 * GlassButton Component
 * Frosted translucent glass button with subtle borders, smooth hover state,
 * and minimum 44px touch target accessibility.
 */
export const GlassButton = ({
  children,
  variant = 'default', // 'default' | 'surface' | 'accent'
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

  const sizeClasses = {
    sm: 'min-h-[44px] px-3.5 py-2 text-xs font-semibold rounded-xl gap-1.5',
    md: 'min-h-[44px] px-5 py-2.5 text-sm font-semibold rounded-xl gap-2',
    lg: 'min-h-[48px] px-6 py-3 text-base font-bold rounded-2xl gap-2.5',
  };

  const variantStyles = {
    default: isHod
      ? 'bg-white/40 hover:bg-white/60 text-hod-text border border-white/50 shadow-sm'
      : 'bg-white/45 hover:bg-white/65 text-student-text border border-white/60 shadow-sm',
    surface: isHod
      ? 'bg-hod-claret/80 hover:bg-hod-claret text-white border border-white/20 shadow-md shadow-hod-claret/15'
      : 'bg-student-teal/80 hover:bg-student-teal text-white border border-white/30 shadow-md shadow-student-teal/20',
    accent: isHod
      ? 'bg-hod-tangerine/90 hover:bg-hod-tangerine text-white border border-white/30 shadow-lg shadow-hod-tangerine/20'
      : 'bg-student-cherry/90 hover:bg-student-cherry text-white border border-white/30 shadow-lg shadow-student-cherry/20',
  };

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`
        inline-flex items-center justify-center
        backdrop-blur-md
        transition-all duration-200
        active:scale-[0.98]
        select-none
        cursor-pointer
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
        ${isHod ? 'focus-visible:ring-hod-tangerine' : 'focus-visible:ring-student-cherry'}
        disabled:opacity-50 disabled:pointer-events-none
        ${sizeClasses[size] || sizeClasses.md}
        ${variantStyles[variant] || variantStyles.default}
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

export default GlassButton;

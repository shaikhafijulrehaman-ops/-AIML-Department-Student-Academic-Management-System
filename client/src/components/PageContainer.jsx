import React from 'react';
import { useTheme } from '../context/ThemeContext';

/**
 * PageContainer Component
 * Root layout container applying centralized 60% background theme color,
 * preventing page-level horizontal overflow, and ensuring consistent responsive padding.
 */
export const PageContainer = ({
  children,
  className = '',
  maxWidth = 'max-w-7xl',
  as: Component = 'div',
  ...props
}) => {
  const { isHod } = useTheme();

  return (
    <Component
      className={`
        min-h-screen
        w-full
        overflow-x-hidden
        transition-colors duration-300
        ${isHod ? 'bg-hod-sage text-hod-text' : 'bg-student-almond text-student-text'}
        ${className}
      `}
      {...props}
    >
      <div className={`mx-auto w-full ${maxWidth} px-4 sm:px-6 lg:px-8 py-4 sm:py-6`}>
        {children}
      </div>
    </Component>
  );
};

export default PageContainer;

import React from 'react';
import { useTheme } from '../context/ThemeContext';

/**
 * NotificationBadge Component
 * Shows notification counts or pulse indicators using theme primary accent colors.
 */
export const NotificationBadge = ({
  count = 0,
  dotOnly = false,
  max = 99,
  pulse = false,
  className = '',
}) => {
  const { isHod } = useTheme();

  const accentColor = isHod
    ? 'bg-hod-tangerine text-white'
    : 'bg-student-cherry text-white';

  if (dotOnly) {
    return (
      <span className={`relative flex h-2.5 w-2.5 ${className}`}>
        {pulse && (
          <span
            className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${accentColor}`}
          />
        )}
        <span
          className={`relative inline-flex rounded-full h-2.5 w-2.5 ring-2 ring-white ${accentColor}`}
        />
      </span>
    );
  }

  if (count <= 0) return null;

  const displayCount = count > max ? `${max}+` : count;

  return (
    <span
      className={`
        inline-flex items-center justify-center
        min-w-[18px] h-[18px] px-1.5
        text-[10px] font-bold leading-none
        rounded-full ring-2 ring-white
        shadow-sm select-none
        ${accentColor}
        ${pulse ? 'animate-pulse' : ''}
        ${className}
      `}
      aria-label={`${count} unread notifications`}
    >
      {displayCount}
    </span>
  );
};

export default NotificationBadge;

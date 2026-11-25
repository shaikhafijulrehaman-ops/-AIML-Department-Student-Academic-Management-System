import React, { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import NotificationBadge from './NotificationBadge';

/**
 * SpotlightNavItem Component
 * Nav item supporting mouse spotlight illumination, theme active glow,
 * and isolated click-triggered bounce animation for students (which does not repeat on re-render).
 */
export const SpotlightNavItem = ({
  id,
  label,
  icon: Icon,
  isActive = false,
  onClick,
  badge,
  className = '',
}) => {
  const { isHod, isStudent } = useTheme();
  const [isBouncing, setIsBouncing] = useState(false);

  const handleClick = (e) => {
    // Only student theme triggers tactile bounce on click
    if (isStudent) {
      setIsBouncing(true);
    }
    onClick?.(id, e);
  };

  const handleAnimationEnd = () => {
    // Reset bouncing state after animation completes to avoid repeating on re-renders
    setIsBouncing(false);
  };

  // Active glow tokens
  const activeGlowStyles = isHod
    ? 'bg-hod-claret text-white shadow-glow-tangerine ring-1 ring-hod-tangerine/60 font-bold'
    : 'bg-student-teal-dark text-white shadow-glow-cherry ring-1 ring-student-cherry/60 font-bold';

  const inactiveStyles = isHod
    ? 'text-white/80 hover:text-white hover:bg-white/10'
    : 'text-white/85 hover:text-white hover:bg-white/15';

  return (
    <button
      type="button"
      onClick={handleClick}
      onAnimationEnd={handleAnimationEnd}
      aria-current={isActive ? 'page' : undefined}
      className={`
        relative
        flex items-center gap-2
        px-3.5 py-2
        min-h-[44px] min-w-[44px]
        rounded-full
        text-xs sm:text-sm font-medium
        transition-all duration-200
        select-none cursor-pointer
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1
        ${isHod ? 'focus-visible:ring-hod-tangerine' : 'focus-visible:ring-student-cherry'}
        ${isActive ? activeGlowStyles : inactiveStyles}
        ${isBouncing ? 'animate-bounce-once' : ''}
        ${className}
      `}
    >
      {/* Active spotlight background aura */}
      {isActive && (
        <span
          className={`absolute inset-0 rounded-full blur-[6px] opacity-40 -z-10 ${
            isHod ? 'bg-hod-tangerine' : 'bg-student-cherry'
          }`}
          aria-hidden="true"
        />
      )}

      {Icon && <Icon className="w-4 h-4 flex-shrink-0" />}
      <span className="truncate whitespace-nowrap">{label}</span>

      {badge !== undefined && (
        <NotificationBadge count={badge} className="ml-1" />
      )}
    </button>
  );
};

export default SpotlightNavItem;

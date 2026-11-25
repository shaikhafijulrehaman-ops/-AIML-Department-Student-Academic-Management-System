import React from 'react';
import { useTheme } from '../context/ThemeContext';

/**
 * ProfileAvatar Component
 * Displays user avatar with initials or photo, role tag, and online status indicator.
 */
export const ProfileAvatar = ({
  name = 'Dr. K. Srinivas Rao',
  role = 'HOD', // 'HOD' | 'Student' | 'Faculty'
  imageUrl,
  size = 'md', // 'sm' | 'md' | 'lg'
  showStatus = true,
  status = 'online', // 'online' | 'busy' | 'offline'
  className = '',
}) => {
  const { isHod } = useTheme();

  // Extract initials
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');

  const sizeDimensions = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-14 h-14 text-lg font-bold',
  };

  const statusColors = {
    online: 'bg-emerald-500',
    busy: isHod ? 'bg-hod-tangerine' : 'bg-student-cherry',
    offline: 'bg-slate-400',
  };

  const avatarBg = isHod
    ? 'bg-gradient-to-tr from-hod-claret to-hod-claret-light text-white ring-2 ring-white/50 shadow-md shadow-hod-claret/20'
    : 'bg-gradient-to-tr from-student-teal-dark to-student-teal text-white ring-2 ring-white/60 shadow-md shadow-student-teal/20';

  return (
    <div className={`relative inline-flex items-center gap-3 ${className}`}>
      <div
        className={`relative inline-flex items-center justify-center rounded-full font-bold select-none overflow-hidden flex-shrink-0 ${sizeDimensions[size]} ${avatarBg}`}
      >
        {imageUrl ? (
          <img src={imageUrl} alt={name} className="w-full h-full object-cover" />
        ) : (
          <span>{initials}</span>
        )}

        {showStatus && (
          <span
            className={`absolute bottom-0 right-0 block w-2.5 h-2.5 rounded-full ring-2 ring-white ${statusColors[status]}`}
            title={`Status: ${status}`}
          />
        )}
      </div>

      {size !== 'sm' && (
        <div className="flex flex-col min-w-0">
          <span className="text-xs font-bold truncate text-slate-800 leading-tight">
            {name}
          </span>
          <span
            className={`text-[10px] font-semibold tracking-wider uppercase ${
              isHod ? 'text-hod-tangerine' : 'text-student-cherry'
            }`}
          >
            {role}
          </span>
        </div>
      )}
    </div>
  );
};

export default ProfileAvatar;

import React from 'react';
import { useTheme } from '../context/ThemeContext';
import ClayCard from './ClayCard';

/**
 * ProgressCard Component
 * Displays visual completion or academic progress metrics with clay styling.
 */
export const ProgressCard = ({
  title,
  current,
  total,
  percentage,
  unit = '',
  statusLabel,
  caption,
  className = '',
}) => {
  const { isHod } = useTheme();

  const computedPercentage = percentage !== undefined 
    ? percentage 
    : total > 0 
    ? Math.min(100, Math.round((current / total) * 100)) 
    : 0;

  const barColor = isHod ? 'bg-hod-tangerine' : 'bg-student-cherry';
  const trackBg = isHod ? 'bg-hod-claret/15' : 'bg-student-teal/20';

  return (
    <ClayCard className={`flex flex-col justify-between ${className}`} interactive>
      <div>
        <div className="flex items-start justify-between gap-2 mb-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            {title}
          </h4>
          {statusLabel && (
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                isHod
                  ? 'bg-hod-claret/10 text-hod-claret'
                  : 'bg-student-teal/15 text-student-teal-dark'
              }`}
            >
              {statusLabel}
            </span>
          )}
        </div>

        <div className="flex items-baseline gap-1 mt-1 mb-3">
          <span className="text-3xl font-extrabold text-slate-900">
            {computedPercentage}%
          </span>
          {total !== undefined && (
            <span className="text-xs text-slate-500 font-medium">
              ({current} / {total} {unit})
            </span>
          )}
        </div>

        {/* Progress Track */}
        <div className={`w-full h-3 rounded-full overflow-hidden p-0.5 shadow-inner ${trackBg}`}>
          <div
            className={`h-full rounded-full transition-all duration-700 ease-out shadow-sm ${barColor}`}
            style={{ width: `${computedPercentage}%` }}
          />
        </div>
      </div>

      {caption && (
        <p className="text-xs text-slate-500 mt-3 pt-2 border-t border-slate-200/50">
          {caption}
        </p>
      )}
    </ClayCard>
  );
};

export default ProgressCard;

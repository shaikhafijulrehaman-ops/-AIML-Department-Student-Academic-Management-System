import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import ClayCard from './ClayCard';

/**
 * StatCard Component
 * Claymorphic metric card displaying key indicators, trends, and descriptive labels.
 */
export const StatCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend, // { direction: 'up' | 'down' | 'neutral', value: '+4.8%' }
  badge,
  className = '',
}) => {
  const { isHod } = useTheme();

  return (
    <ClayCard className={`flex flex-col justify-between ${className}`} interactive>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {title}
          </span>
          <div className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-1 text-slate-900">
            {value}
          </div>
        </div>

        {Icon && (
          <div
            className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-inner ${
              isHod
                ? 'bg-hod-claret/10 text-hod-claret'
                : 'bg-student-teal/15 text-student-teal-dark'
            }`}
          >
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-200/50 mt-1">
        {trend && (
          <div
            className={`inline-flex items-center gap-1 font-semibold ${
              trend.direction === 'up'
                ? 'text-emerald-700'
                : trend.direction === 'down'
                ? 'text-rose-600'
                : 'text-slate-500'
            }`}
          >
            {trend.direction === 'up' && <TrendingUp className="w-3.5 h-3.5" />}
            {trend.direction === 'down' && <TrendingDown className="w-3.5 h-3.5" />}
            {trend.direction === 'neutral' && <Minus className="w-3.5 h-3.5" />}
            <span>{trend.value}</span>
            <span className="text-slate-400 font-normal">vs last term</span>
          </div>
        )}

        {subtitle && !trend && (
          <span className="text-slate-500 text-[11px]">{subtitle}</span>
        )}

        {badge && (
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              isHod
                ? 'bg-hod-tangerine/15 text-hod-tangerine'
                : 'bg-student-cherry/15 text-student-cherry'
            }`}
          >
            {badge}
          </span>
        )}
      </div>
    </ClayCard>
  );
};

export default StatCard;

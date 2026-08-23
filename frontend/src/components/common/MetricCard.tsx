import React from 'react';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  target?: string;
  icon?: LucideIcon;
  status?: 'success' | 'danger' | 'warning' | 'neutral' | 'info';
  trend?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  target,
  icon: Icon,
  status = 'neutral',
  trend,
}) => {
  let borderBorder = 'border-slate-800 hover:border-slate-700';
  let valueColor = 'text-slate-100';

  if (status === 'success') {
    borderBorder = 'border-emerald-500/20 hover:border-emerald-500/40 bg-emerald-950/10';
    valueColor = 'text-emerald-400';
  } else if (status === 'danger') {
    borderBorder = 'border-rose-500/20 hover:border-rose-500/40 bg-rose-950/10';
    valueColor = 'text-rose-400';
  } else if (status === 'warning') {
    borderBorder = 'border-amber-500/20 hover:border-amber-500/40 bg-amber-950/10';
    valueColor = 'text-amber-400';
  } else if (status === 'info') {
    borderBorder = 'border-blue-500/20 hover:border-blue-500/40 bg-blue-950/10';
    valueColor = 'text-blue-400';
  }

  return (
    <div className={`p-4 rounded-lg bg-slate-900/80 border ${borderBorder} transition-all shadow-sm relative overflow-hidden group`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</span>
        {Icon && <Icon className="w-4 h-4 text-slate-500 group-hover:text-slate-300 transition-colors" />}
      </div>
      <div className="flex items-baseline justify-between">
        <div className={`text-2xl font-bold mono-font tracking-tight ${valueColor}`}>{value}</div>
        {trend && (
          <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${trend.startsWith('+') ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
            {trend}
          </span>
        )}
      </div>
      {(subtitle || target) && (
        <div className="mt-2 flex items-center justify-between text-xs text-slate-500 border-t border-slate-800/80 pt-2">
          {subtitle && <span>{subtitle}</span>}
          {target && <span className="mono-font font-medium text-slate-400">Target: {target}</span>}
        </div>
      )}
    </div>
  );
};

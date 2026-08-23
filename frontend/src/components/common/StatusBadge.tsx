import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Clock, ShieldAlert, Play } from 'lucide-react';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'md',
  showIcon = true,
}) => {
  const norm = (status || '').toUpperCase();

  let colorClasses = 'bg-slate-800 text-slate-300 border-slate-700';
  let IconComponent = CheckCircle2;

  if (['PASS', 'PASSED', 'SUCCESS', 'APPROVED', 'COMPLETED', 'IMPROVED', 'NO_REGRESSION'].includes(norm)) {
    colorClasses = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    IconComponent = CheckCircle2;
  } else if (['BLOCK', 'BLOCKED', 'FAILED', 'CRITICAL', 'REGRESSED', 'REGRESSION_DETECTED'].includes(norm)) {
    colorClasses = 'bg-rose-500/10 text-rose-400 border-rose-500/30';
    IconComponent = XCircle;
  } else if (['HIGH', 'WARNING', 'VIOLATIONS_FOUND', 'COMPLETED_WITH_FAILURES'].includes(norm)) {
    colorClasses = 'bg-amber-500/10 text-amber-400 border-amber-500/30';
    IconComponent = AlertTriangle;
  } else if (['RUNNING', 'IN_PROGRESS', 'PENDING'].includes(norm)) {
    colorClasses = 'bg-blue-500/10 text-blue-400 border-blue-500/30 animate-pulse';
    IconComponent = Play;
  } else if (['TIMEOUT'].includes(norm)) {
    colorClasses = 'bg-purple-500/10 text-purple-400 border-purple-500/30';
    IconComponent = Clock;
  } else if (['MEDIUM', 'LOW'].includes(norm)) {
    colorClasses = 'bg-slate-800 text-slate-300 border-slate-700';
    IconComponent = ShieldAlert;
  }

  const sizeClasses =
    size === 'sm'
      ? 'px-2 py-0.5 text-xs gap-1'
      : size === 'lg'
      ? 'px-3 py-1.5 text-sm gap-2 font-semibold'
      : 'px-2.5 py-1 text-xs gap-1.5 font-medium';

  return (
    <span
      className={`inline-flex items-center rounded-md border mono-font tracking-wide uppercase ${sizeClasses} ${colorClasses}`}
    >
      {showIcon && <IconComponent className={size === 'sm' ? 'w-3 h-3' : size === 'lg' ? 'w-4 h-4' : 'w-3.5 h-3.5'} />}
      <span>{norm.replace(/_/g, ' ')}</span>
    </span>
  );
};

import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingStateProps {
  label?: string;
  rows?: number;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  label = 'Loading AgentGuard Engine evaluation metrics...',
  rows = 3,
}) => {
  return (
    <div className="p-6 rounded-lg border border-slate-800 bg-slate-900/60 my-4 space-y-4">
      <div className="flex items-center gap-2.5 text-xs text-slate-400 font-medium">
        <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
        <span>{label}</span>
      </div>
      <div className="space-y-2.5">
        {Array.from({ length: rows }).map((_, idx) => (
          <div key={idx} className="h-8 bg-slate-800/60 rounded animate-pulse w-full" />
        ))}
      </div>
    </div>
  );
};

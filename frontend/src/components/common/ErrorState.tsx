import React from 'react';
import { AlertOctagon, RefreshCw } from 'lucide-react';

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Backend Communication Error',
  message,
  onRetry,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 my-6 rounded-lg border border-rose-500/20 bg-rose-950/10 text-center">
      <div className="p-3 rounded-full bg-rose-500/10 text-rose-400 mb-3 border border-rose-500/30">
        <AlertOctagon className="w-6 h-6" />
      </div>
      <h4 className="text-sm font-semibold text-rose-300">{title}</h4>
      <p className="text-xs text-slate-400 max-w-md mt-1 mb-4 leading-relaxed mono-font bg-slate-900/90 p-2.5 rounded border border-slate-800 text-left w-full overflow-x-auto">
        {message}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-rose-600/80 hover:bg-rose-600 text-xs font-medium text-white shadow-sm transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Retry Request</span>
        </button>
      )}
    </div>
  );
};

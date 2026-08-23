import React from 'react';
import { ShieldCheck, Server, RefreshCw, Cpu, GitBranch } from 'lucide-react';

interface TopBarProps {
  currentVersion: string;
  onVersionChange: (version: string) => void;
  backendConnected: boolean;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export const TopBar: React.FC<TopBarProps> = ({
  currentVersion,
  onVersionChange,
  backendConnected,
  onRefresh,
  isRefreshing,
}) => {
  return (
    <header className="h-14 border-b border-slate-800 bg-slate-950 px-4 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-blue-600/20 border border-blue-500/30 text-blue-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-slate-100 flex items-center gap-2">
              AgentGuard
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono font-normal">
                v1.0.0 Engine
              </span>
            </h1>
            <p className="text-[11px] text-slate-400 hidden sm:block">AI Agent Evaluation & Reliability Platform</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Active Agent & Version Selector Context */}
        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-md px-2.5 py-1 text-xs">
          <div className="flex items-center gap-1.5 text-slate-400">
            <Cpu className="w-3.5 h-3.5 text-blue-400" />
            <span className="font-medium text-slate-300 hidden md:inline">Agent:</span>
          </div>
          <span className="font-semibold text-slate-200">Customer Support Agent</span>
          <span className="text-slate-600">|</span>
          <div className="flex items-center gap-1">
            <GitBranch className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={currentVersion}
              onChange={(e) => onVersionChange(e.target.value)}
              className="bg-transparent text-xs font-mono font-semibold text-blue-400 focus:outline-none cursor-pointer"
            >
              <option value="v1.0.0" className="bg-slate-900 text-slate-200">
                v1.0.0 (Baseline Stable)
              </option>
              <option value="v2.0.0-regressed" className="bg-slate-900 text-slate-200">
                v2.0.0-regressed (Candidate)
              </option>
            </select>
          </div>
        </div>

        {/* Backend Connectivity Badge */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 text-xs">
          <Server className="w-3.5 h-3.5 text-slate-400" />
          <span
            className={`w-2 h-2 rounded-full ${
              backendConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
            }`}
          />
          <span className="text-slate-300 font-mono text-[11px] hidden sm:inline">
            {backendConnected ? 'API Connected' : 'API Offline'}
          </span>
        </div>

        {/* Refresh Trigger */}
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="p-1.5 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 transition-colors disabled:opacity-50"
          title="Refresh Backend Data"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-blue-400' : ''}`} />
        </button>
      </div>
    </header>
  );
};

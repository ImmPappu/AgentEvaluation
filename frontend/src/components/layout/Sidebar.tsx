import React from 'react';
import {
  LayoutDashboard,
  GitPullRequest,
  GitBranch,
  ShieldCheck,
  AlertOctagon,
  FileCode,
  Award,
} from 'lucide-react';

export type NavTab =
  | 'overview'
  | 'pipeline'
  | 'versions'
  | 'scenarios'
  | 'failures'
  | 'guardrails'
  | 'scorecard';

interface SidebarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  failureCount?: number;
  guardrailViolationCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  failureCount = 0,
  guardrailViolationCount = 0,
}) => {
  const navItems = [
    { id: 'overview' as NavTab, label: 'Overview', icon: LayoutDashboard },
    { id: 'pipeline' as NavTab, label: 'Pipeline Runs', icon: GitPullRequest },
    { id: 'versions' as NavTab, label: 'Agent Versions', icon: GitBranch },
    { id: 'scenarios' as NavTab, label: 'Scenarios Library', icon: FileCode },
    {
      id: 'failures' as NavTab,
      label: 'Failure Explorer',
      icon: AlertOctagon,
      badge: failureCount > 0 ? failureCount : undefined,
      badgeColor: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
    },
    {
      id: 'guardrails' as NavTab,
      label: 'Guardrail Matrix',
      icon: ShieldCheck,
      badge: guardrailViolationCount > 0 ? guardrailViolationCount : undefined,
      badgeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    },
    { id: 'scorecard' as NavTab, label: 'Reliability Scorecard', icon: Award },
  ];

  return (
    <aside className="w-60 border-r border-slate-800 bg-slate-950 flex flex-col justify-between shrink-0">
      <div className="p-3 space-y-1">
        <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Navigation
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-blue-600/10 text-blue-400 border border-blue-500/30 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon className={`w-4 h-4 ${isActive ? 'text-blue-400' : 'text-slate-500'}`} />
                <span>{item.label}</span>
              </div>

              {item.badge !== undefined && (
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono border ${
                    item.badgeColor || 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="p-4 border-t border-slate-900 bg-slate-900/30">
        <div className="text-[11px] font-mono text-slate-400 space-y-1">
          <div className="flex justify-between">
            <span>Runtime:</span>
            <span className="text-slate-300">Docker Sandbox</span>
          </div>
          <div className="flex justify-between">
            <span>Isolation:</span>
            <span className="text-emerald-400 font-semibold">Network None</span>
          </div>
          <div className="flex justify-between">
            <span>Seed:</span>
            <span className="text-slate-300">42 (Deterministic)</span>
          </div>
        </div>
      </div>
    </aside>
  );
};

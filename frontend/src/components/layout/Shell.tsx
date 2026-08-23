import React from 'react';
import { TopBar } from './TopBar';
import { Sidebar, NavTab } from './Sidebar';

interface ShellProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  currentVersion: string;
  onVersionChange: (version: string) => void;
  backendConnected: boolean;
  onRefresh: () => void;
  isRefreshing: boolean;
  failureCount?: number;
  guardrailViolationCount?: number;
  children: React.ReactNode;
}

export const Shell: React.FC<ShellProps> = ({
  activeTab,
  onTabChange,
  currentVersion,
  onVersionChange,
  backendConnected,
  onRefresh,
  isRefreshing,
  failureCount,
  guardrailViolationCount,
  children,
}) => {
  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 font-sans">
      <TopBar
        currentVersion={currentVersion}
        onVersionChange={onVersionChange}
        backendConnected={backendConnected}
        onRefresh={onRefresh}
        isRefreshing={isRefreshing}
      />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          activeTab={activeTab}
          onTabChange={onTabChange}
          failureCount={failureCount}
          guardrailViolationCount={guardrailViolationCount}
        />
        <main className="flex-1 overflow-y-auto p-6 bg-slate-950/60">
          <div className="max-w-7xl mx-auto space-y-6">{children}</div>
        </main>
      </div>
    </div>
  );
};

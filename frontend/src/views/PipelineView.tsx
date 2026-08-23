import React, { useState } from 'react';
import { PipelineRun } from '../types/agentguard';
import { StatusBadge } from '../components/common/StatusBadge';
import {
  Play,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ChevronRight,
  RefreshCw,
  Terminal,
  Cpu,
} from 'lucide-react';

interface PipelineViewProps {
  runs: PipelineRun[];
  activeRun: PipelineRun | null;
  onTriggerRun: (version: string, simulateRegression: boolean) => void;
  onSelectRun: (runId: string) => void;
  isTriggering: boolean;
}

export const PipelineView: React.FC<PipelineViewProps> = ({
  runs,
  activeRun,
  onTriggerRun,
  onSelectRun,
  isTriggering,
}) => {
  const [selectedVersion, setSelectedVersion] = useState<string>('v1.0.0');
  const [simulateRegression, setSimulateRegression] = useState<boolean>(false);

  const stagesList = [
    { key: 'scenario_generation', label: '1. Scenario Generation' },
    { key: 'sandbox_execution', label: '2. Sandbox Execution' },
    { key: 'failure_classification', label: '3. Failure Classification' },
    { key: 'guardrail_evaluation', label: '4. Guardrail Evaluation' },
    { key: 'reliability_scoring', label: '5. Reliability Scoring' },
    { key: 'release_decision', label: '6. Release Quality Gate' },
  ];

  return (
    <div className="space-y-6">
      {/* Top Controls: Trigger Evaluation Pipeline */}
      <div className="p-5 rounded-lg border border-slate-800 bg-slate-900/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200">
            Trigger CI/CD Evaluation Pipeline
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Executes agent in isolated Docker Sandbox (`--network none`) against benchmark & adversarial scenario suites.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-xs">
            <Cpu className="w-3.5 h-3.5 text-blue-400" />
            <select
              value={selectedVersion}
              onChange={(e) => setSelectedVersion(e.target.value)}
              className="bg-transparent text-xs font-mono font-semibold text-slate-200 focus:outline-none"
            >
              <option value="v1.0.0" className="bg-slate-900">v1.0.0 (Stable)</option>
              <option value="v2.0.0-regressed" className="bg-slate-900">v2.0.0-regressed (Candidate)</option>
            </select>
          </div>

          <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={simulateRegression}
              onChange={(e) => setSimulateRegression(e.target.checked)}
              className="rounded border-slate-700 bg-slate-950 text-blue-500 focus:ring-0"
            />
            <span className="font-mono text-[11px]">Simulate Regression</span>
          </label>

          <button
            onClick={() => onTriggerRun(selectedVersion, simulateRegression)}
            disabled={isTriggering}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white transition-colors disabled:opacity-50"
          >
            {isTriggering ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            <span>{isTriggering ? 'Executing...' : 'Run Pipeline'}</span>
          </button>
        </div>
      </div>

      {/* Selected Active Run Visual Stage Flow */}
      {activeRun && (
        <div className="p-5 rounded-lg border border-slate-800 bg-slate-900/60 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-200 mono-font">Run #{activeRun.run_id}</h3>
                <StatusBadge status={activeRun.status} size="sm" />
              </div>
              <p className="text-xs text-slate-400 mt-0.5 font-mono">
                Agent Version: {activeRun.agent_version} | Triggered: {activeRun.created_at}
              </p>
            </div>
            {activeRun.completed_at && (
              <span className="text-xs text-slate-400 font-mono">Completed in {activeRun.duration_seconds || 1.2}s</span>
            )}
          </div>

          {/* 6 Stage Horizontal Flow Visualizer */}
          <div className="grid grid-cols-1 md:grid-cols-6 gap-2">
            {stagesList.map((stageItem) => {
              const stageData = activeRun.stages?.[stageItem.key] || {
                name: stageItem.label,
                status: 'PENDING',
                details: '',
              };

              let bgClass = 'bg-slate-950 border-slate-800 text-slate-400';
              if (['PASSED', 'COMPLETED'].includes(stageData.status)) {
                bgClass = 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300';
              } else if (['BLOCKED', 'FAILED', 'VIOLATIONS_FOUND'].includes(stageData.status)) {
                bgClass = 'bg-rose-950/20 border-rose-500/30 text-rose-300';
              } else if (stageData.status === 'IN_PROGRESS') {
                bgClass = 'bg-blue-950/20 border-blue-500/30 text-blue-300 animate-pulse';
              }

              return (
                <div key={stageItem.key} className={`p-3 rounded border text-xs space-y-1.5 ${bgClass}`}>
                  <div className="font-semibold truncate">{stageItem.label}</div>
                  <div className="flex items-center justify-between">
                    <StatusBadge status={stageData.status} size="sm" showIcon={false} />
                  </div>
                  {stageData.details && (
                    <div className="text-[11px] font-mono text-slate-400 truncate">{stageData.details}</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Historical Pipeline Runs Table */}
      <div className="p-5 rounded-lg border border-slate-800 bg-slate-900/60 space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
          Execution Run History ({runs.length})
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase">
                <th className="py-2.5 px-3">Run ID</th>
                <th className="py-2.5 px-3">Version</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Scenarios</th>
                <th className="py-2.5 px-3">Pass / Fail</th>
                <th className="py-2.5 px-3">Duration</th>
                <th className="py-2.5 px-3">Executed At</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {runs.map((r, idx) => (
                <tr
                  key={idx}
                  onClick={() => onSelectRun(r.run_id)}
                  className={`hover:bg-slate-800/40 cursor-pointer transition-colors ${
                    activeRun?.run_id === r.run_id ? 'bg-blue-950/20' : ''
                  }`}
                >
                  <td className="py-2.5 px-3 font-semibold text-blue-400">{r.run_id}</td>
                  <td className="py-2.5 px-3 text-slate-200">{r.agent_version}</td>
                  <td className="py-2.5 px-3">
                    <StatusBadge status={r.status} size="sm" />
                  </td>
                  <td className="py-2.5 px-3 text-slate-300">{r.total_scenarios || 20}</td>
                  <td className="py-2.5 px-3 text-slate-300">
                    <span className="text-emerald-400">{r.passed || 0} P</span> /{' '}
                    <span className="text-rose-400">{r.failed || 0} F</span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-400">{r.duration_seconds || 1.2}s</td>
                  <td className="py-2.5 px-3 text-slate-400">{r.created_at}</td>
                  <td className="py-2.5 px-3 text-right">
                    <span className="text-blue-400 hover:text-blue-300 inline-flex items-center gap-1">
                      Details <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

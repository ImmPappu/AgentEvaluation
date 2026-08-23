import React, { useState, useEffect } from 'react';
import { AgentVersionInfo, RegressionDiff } from '../types/agentguard';
import { AgentGuardAPI } from '../services/api';
import { StatusBadge } from '../components/common/StatusBadge';
import { LoadingState } from '../components/common/LoadingState';
import { ErrorState } from '../components/common/ErrorState';
import {
  GitBranch,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  Minus,
} from 'lucide-react';

interface AgentVersionsViewProps {
  versions: AgentVersionInfo[];
}

export const AgentVersionsView: React.FC<AgentVersionsViewProps> = ({ versions }) => {
  const [compareData, setCompareData] = useState<{
    v1: string;
    v2: string;
    diff: RegressionDiff;
    report_text: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [v1, setV1] = useState<string>('v1.0.0');
  const [v2, setV2] = useState<string>('v2.0.0-regressed');

  const loadComparison = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await AgentGuardAPI.compareVersions(v1, v2);
      setCompareData(res);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to compare agent versions.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadComparison();
  }, [v1, v2]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="p-5 rounded-lg border border-slate-800 bg-slate-900/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-blue-400" />
            Agent Version History & Regression Comparator
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Compare baseline vs candidate builds for safety regressions using `agentguard.regression.comparator`.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400">Baseline:</span>
          <select
            value={v1}
            onChange={(e) => setV1(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-slate-200 font-mono font-semibold"
          >
            <option value="v1.0.0">v1.0.0</option>
          </select>
          <span className="text-slate-500 font-bold">VS</span>
          <span className="text-slate-400">Candidate:</span>
          <select
            value={v2}
            onChange={(e) => setV2(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-slate-200 font-mono font-semibold"
          >
            <option value="v2.0.0-regressed">v2.0.0-regressed</option>
          </select>
        </div>
      </div>

      {/* Available Registered Agent Versions Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {versions.map((ver, idx) => (
          <div key={idx} className="p-5 rounded-lg border border-slate-800 bg-slate-900/60 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-100 font-mono">{ver.tag}</h3>
                <p className="text-xs text-slate-400">Created: {ver.created_at}</p>
              </div>
              <StatusBadge status={ver.status} size="sm" />
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/80 text-xs font-mono">
              <div className="p-2 rounded bg-slate-950/60 border border-slate-800/60">
                <span className="text-slate-400 block text-[10px]">Reliability</span>
                <span className="font-bold text-slate-200">{ver.summary.scores.overall}%</span>
              </div>
              <div className="p-2 rounded bg-slate-950/60 border border-slate-800/60">
                <span className="text-slate-400 block text-[10px]">Safety</span>
                <span className={`font-bold ${ver.summary.scores.safety >= 80 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {ver.summary.scores.safety}%
                </span>
              </div>
              <div className="p-2 rounded bg-slate-950/60 border border-slate-800/60">
                <span className="text-slate-400 block text-[10px]">Critical Fails</span>
                <span className={`font-bold ${ver.summary.critical_failures === 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {ver.summary.critical_failures}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Comparison Engine Output */}
      {isLoading ? (
        <LoadingState label="Computing version regression delta..." />
      ) : errorMsg ? (
        <ErrorState message={errorMsg} onRetry={loadComparison} />
      ) : compareData ? (
        <div className="space-y-6">
          {/* Regression Alert Box */}
          <div
            className={`p-5 rounded-lg border ${
              compareData.diff.has_critical_regression || compareData.diff.verdict === 'REGRESSION_DETECTED'
                ? 'bg-rose-950/20 border-rose-500/30 text-rose-300'
                : 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="p-2 rounded bg-slate-900 border border-slate-800">
                {compareData.diff.has_critical_regression ? (
                  <AlertTriangle className="w-5 h-5 text-rose-400" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold uppercase tracking-tight">
                    Regression Verdict: {compareData.diff.verdict}
                  </h3>
                  <StatusBadge
                    status={compareData.diff.verdict === 'REGRESSION_DETECTED' ? 'REGRESSED' : 'PASSED'}
                    size="sm"
                  />
                </div>
                <p className="text-xs text-slate-300 mt-1">
                  Overall Score Delta: {' '}
                  <span className={`font-mono font-bold ${compareData.diff.overall_delta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {compareData.diff.overall_delta >= 0 ? `+${compareData.diff.overall_delta}%` : `${compareData.diff.overall_delta}%`}
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Side-by-Side Category Breakdown Table */}
          <div className="p-5 rounded-lg border border-slate-800 bg-slate-900/60 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Dimensional Delta Breakdown ({v1} vs {v2})
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase">
                    <th className="py-2.5 px-3">Dimension</th>
                    <th className="py-2.5 px-3">{v1} Baseline</th>
                    <th className="py-2.5 px-3">{v2} Candidate</th>
                    <th className="py-2.5 px-3">Delta</th>
                    <th className="py-2.5 px-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {Object.entries(compareData.diff.category_diffs || {}).map(([catKey, catDiff], idx) => (
                    <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-slate-200 capitalize">
                        {catKey.replace(/_/g, ' ')}
                      </td>
                      <td className="py-2.5 px-3 text-slate-300">{catDiff.v1_score.toFixed(1)}%</td>
                      <td className="py-2.5 px-3 text-slate-300">{catDiff.v2_score.toFixed(1)}%</td>
                      <td className={`py-2.5 px-3 font-bold ${catDiff.delta < 0 ? 'text-rose-400' : catDiff.delta > 0 ? 'text-emerald-400' : 'text-slate-400'}`}>
                        {catDiff.delta > 0 ? `+${catDiff.delta.toFixed(1)}%` : `${catDiff.delta.toFixed(1)}%`}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <StatusBadge status={catDiff.status} size="sm" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Formatted CLI Comparison Text Report Output */}
          <div className="p-5 rounded-lg border border-slate-800 bg-slate-900/60 space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Raw Regression Comparator CLI Report
            </h3>
            <pre className="p-3.5 rounded bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto leading-relaxed">
              {compareData.report_text}
            </pre>
          </div>
        </div>
      ) : null}
    </div>
  );
};

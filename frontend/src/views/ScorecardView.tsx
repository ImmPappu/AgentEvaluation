import React, { useState, useEffect } from 'react';
import { Scorecard } from '../types/agentguard';
import { AgentGuardAPI } from '../services/api';
import { StatusBadge } from '../components/common/StatusBadge';
import { LoadingState } from '../components/common/LoadingState';
import { ErrorState } from '../components/common/ErrorState';
import {
  Award,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Layers,
  HelpCircle,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface ScorecardViewProps {
  currentVersion: string;
}

export const ScorecardView: React.FC<ScorecardViewProps> = ({ currentVersion }) => {
  const [data, setData] = useState<{
    agent_version: string;
    scorecard: Scorecard;
    ci_status: string;
    scenarios_total: number;
    passed: number;
    failed: number;
    critical_failures: number;
    weights: Record<string, number>;
    thresholds: { safety_threshold: number; overall_pass_threshold: number };
  } | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadScorecard = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await AgentGuardAPI.getScorecard(currentVersion);
      setData(res);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load reliability scorecard.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadScorecard();
  }, [currentVersion]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="p-5 rounded-lg border border-slate-800 bg-slate-900/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
            <Award className="w-4 h-4 text-blue-400" />
            Multidimensional Reliability Scorecard & Hard Safety Gate
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Calculates weighted evaluation across 5 dimensions: Task Success (30%), Safety (30%), Tool Reliability (15%), Instruction Following (15%), Fault Recovery (10%).
          </p>
        </div>

        {data && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">CI Verdict:</span>
            <StatusBadge status={data.ci_status} size="lg" />
          </div>
        )}
      </div>

      {isLoading ? (
        <LoadingState label="Computing fine-grained reliability dimensions..." />
      ) : errorMsg ? (
        <ErrorState message={errorMsg} onRetry={loadScorecard} />
      ) : data ? (
        <div className="space-y-6">
          {/* Main Overall Score Callout */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-lg border border-blue-500/30 bg-blue-950/20 text-center space-y-2 flex flex-col items-center justify-center">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-300">
                Overall Agent Reliability
              </span>
              <div className="text-5xl font-extrabold mono-font text-blue-400">
                {data.scorecard.overall.toFixed(1)}%
              </div>
              <span className="text-xs text-slate-400 font-mono">
                Required Pass Threshold: {data.thresholds.overall_pass_threshold}%
              </span>
            </div>

            <div className="p-6 rounded-lg border border-slate-800 bg-slate-900/60 space-y-3 md:col-span-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Hard Safety Gate Deployment Rules
              </h3>

              <div className="space-y-2 text-xs font-mono">
                <div className="flex items-center justify-between p-2 rounded bg-slate-950 border border-slate-800">
                  <span className="text-slate-300">1. Critical Safety Failures == 0</span>
                  <span className={`font-bold ${data.critical_failures === 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {data.critical_failures === 0 ? '✓ PASSED (0 Critical)' : `✕ FAILED (${data.critical_failures} Critical)`}
                  </span>
                </div>

                <div className="flex items-center justify-between p-2 rounded bg-slate-950 border border-slate-800">
                  <span className="text-slate-300">2. Safety Score &ge; {data.thresholds.safety_threshold}%</span>
                  <span className={`font-bold ${data.scorecard.safety >= data.thresholds.safety_threshold ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {data.scorecard.safety >= data.thresholds.safety_threshold ? `✓ PASSED (${data.scorecard.safety}%)` : `✕ FAILED (${data.scorecard.safety}%)`}
                  </span>
                </div>

                <div className="flex items-center justify-between p-2 rounded bg-slate-950 border border-slate-800">
                  <span className="text-slate-300">3. Overall Reliability &ge; {data.thresholds.overall_pass_threshold}%</span>
                  <span className={`font-bold ${data.scorecard.overall >= data.thresholds.overall_pass_threshold ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {data.scorecard.overall >= data.thresholds.overall_pass_threshold ? `✓ PASSED (${data.scorecard.overall}%)` : `✕ FAILED (${data.scorecard.overall}%)`}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 5-Dimension Scorecard Bars */}
          <div className="p-5 rounded-lg border border-slate-800 bg-slate-900/60 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Dimensional Evaluation Breakdown
            </h3>

            <div className="space-y-3 font-mono text-xs">
              {[
                { name: 'Task Success (30%)', score: data.scorecard.task_success, color: 'bg-emerald-500' },
                { name: 'Safety Rating (30%)', score: data.scorecard.safety, color: 'bg-blue-500' },
                { name: 'Tool Reliability (15%)', score: data.scorecard.tool_reliability, color: 'bg-purple-500' },
                { name: 'Instruction Following (15%)', score: data.scorecard.instruction_following, color: 'bg-amber-500' },
                { name: 'Fault Recovery (10%)', score: data.scorecard.recovery, color: 'bg-cyan-500' },
              ].map((dim, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-slate-300">
                    <span>{dim.name}</span>
                    <span className="font-bold">{dim.score.toFixed(1)}%</span>
                  </div>
                  <div className="h-2.5 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className={`h-full ${dim.color} transition-all duration-500`}
                      style={{ width: `${Math.max(0, Math.min(100, dim.score))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

import React from 'react';
import { OverviewData } from '../types/agentguard';
import { MetricCard } from '../components/common/MetricCard';
import { StatusBadge } from '../components/common/StatusBadge';
import {
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Lock,
  Play,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from 'recharts';

interface OverviewViewProps {
  data: OverviewData;
  onNavigate: (tab: any) => void;
  onRunPipeline: () => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  data,
  onNavigate,
  onRunPipeline,
}) => {
  const { summary, release_gate, agent } = data;
  const scores = summary.scores;

  const radarData = [
    { subject: 'Task Success', score: scores.task_success, fullMark: 100 },
    { subject: 'Safety Rating', score: scores.safety, fullMark: 100 },
    { subject: 'Tool Reliability', score: scores.tool_reliability, fullMark: 100 },
    { subject: 'Instruction Following', score: scores.instruction_following, fullMark: 100 },
    { subject: 'Fault Recovery', score: scores.recovery, fullMark: 100 },
  ];

  const failureDistribution = [
    { category: 'Critical', count: summary.critical_failures, color: '#f43f5e' },
    { category: 'High', count: summary.high_failures, color: '#f59e0b' },
    { category: 'Medium', count: summary.medium_failures, color: '#64748b' },
    { category: 'Passed', count: summary.passed, color: '#10b981' },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner: Release Quality Gate Decision */}
      <div
        className={`p-5 rounded-lg border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm ${
          release_gate.status === 'PASS'
            ? 'bg-emerald-950/20 border-emerald-500/30'
            : 'bg-rose-950/20 border-rose-500/30'
        }`}
      >
        <div className="flex items-start gap-3.5">
          <div
            className={`p-2.5 rounded-lg shrink-0 ${
              release_gate.status === 'PASS'
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
            }`}
          >
            {release_gate.status === 'PASS' ? (
              <CheckCircle2 className="w-6 h-6" />
            ) : (
              <ShieldAlert className="w-6 h-6" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-base font-bold text-slate-100 uppercase tracking-tight">
                Release Quality Gate: {release_gate.status}
              </h2>
              <StatusBadge status={release_gate.status} size="sm" />
            </div>
            <p className="text-xs text-slate-300 mt-1">{release_gate.recommendation}</p>
            {release_gate.blocking_reasons && release_gate.blocking_reasons.length > 0 && (
              <ul className="mt-2 space-y-1">
                {release_gate.blocking_reasons.map((reason, idx) => (
                  <li key={idx} className="text-xs text-rose-300 flex items-center gap-1.5 font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                    {reason}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 self-end md:self-auto">
          <button
            onClick={onRunPipeline}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-md bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white shadow-sm transition-colors"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Run Pipeline Test</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          title="Overall Reliability"
          value={`${scores.overall.toFixed(1)}%`}
          target="80.0%"
          icon={TrendingUp}
          status={scores.overall >= 80 ? 'success' : 'danger'}
        />
        <MetricCard
          title="Safety Score"
          value={`${scores.safety.toFixed(1)}%`}
          target="80.0%"
          icon={Lock}
          status={scores.safety >= 80 ? 'success' : 'danger'}
        />
        <MetricCard
          title="Scenarios Executed"
          value={summary.scenarios_total}
          subtitle={`${summary.passed} Passed / ${summary.failed} Failed`}
          icon={FileText}
          status="info"
        />
        <MetricCard
          title="Critical Failures"
          value={summary.critical_failures}
          subtitle="Hard Block Threshold: 0"
          icon={AlertTriangle}
          status={summary.critical_failures === 0 ? 'success' : 'danger'}
        />
      </div>

      {/* Main Charts & Overview Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Multidimensional Radar Chart */}
        <div className="p-5 rounded-lg border border-slate-800 bg-slate-900/60 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              5-Dimension Reliability Scorecard
            </h3>
            <button
              onClick={() => onNavigate('scorecard')}
              className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium"
            >
              <span>View Scorecard</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                <PolarGrid stroke="#334155" />
                <PolarAngleAxis dataKey="subject" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#475569" tick={{ fontSize: 10 }} />
                <Radar
                  name="Agent Version"
                  dataKey="score"
                  stroke="#3b82f6"
                  fill="#3b82f6"
                  fillOpacity={0.4}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Test Result Distribution */}
        <div className="p-5 rounded-lg border border-slate-800 bg-slate-900/60 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Scenario Execution Outcome Breakdown
            </h3>
            <button
              onClick={() => onNavigate('failures')}
              className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium"
            >
              <span>Explore Failures</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={failureDistribution} margin={{ top: 20, right: 20, left: 0, bottom: 20 }}>
                <XAxis dataKey="category" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                <YAxis stroke="#475569" tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '6px' }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {failureDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Failures Preview Table */}
      {summary.failures && summary.failures.length > 0 && (
        <div className="p-5 rounded-lg border border-slate-800 bg-slate-900/60 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Classified Failure Findings ({summary.failures.length})
              </h3>
            </div>
            <button
              onClick={() => onNavigate('failures')}
              className="text-xs text-blue-400 hover:text-blue-300 font-medium"
            >
              View All Details &rarr;
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase">
                  <th className="py-2 px-3">Scenario ID</th>
                  <th className="py-2 px-3">Failure Type</th>
                  <th className="py-2 px-3">Severity</th>
                  <th className="py-2 px-3">Detector</th>
                  <th className="py-2 px-3">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {summary.failures.slice(0, 5).map((f, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 px-3 font-semibold text-blue-400">{f.scenario_id}</td>
                    <td className="py-2.5 px-3 text-slate-200">{f.failure_type}</td>
                    <td className="py-2.5 px-3">
                      <StatusBadge status={f.severity} size="sm" />
                    </td>
                    <td className="py-2.5 px-3 text-slate-400">{f.detector}</td>
                    <td className="py-2.5 px-3 text-slate-300 truncate max-w-xs">{f.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

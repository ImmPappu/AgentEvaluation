import React, { useState, useEffect } from 'react';
import { FailureResult, ExecutionTrace, Scenario, GuardrailResult } from '../types/agentguard';
import { AgentGuardAPI } from '../services/api';
import { StatusBadge } from '../components/common/StatusBadge';
import { LoadingState } from '../components/common/LoadingState';
import { ErrorState } from '../components/common/ErrorState';
import {
  AlertOctagon,
  Search,
  ChevronRight,
  ShieldAlert,
  Terminal,
  FileCode,
  CheckCircle2,
  XCircle,
  Copy,
  Clock,
  RotateCcw,
} from 'lucide-react';

interface FailuresViewProps {
  currentVersion: string;
}

export const FailuresView: React.FC<FailuresViewProps> = ({ currentVersion }) => {
  const [failures, setFailures] = useState<FailureResult[]>([]);
  const [selectedFailure, setSelectedFailure] = useState<FailureResult | null>(null);
  const [failureDetail, setFailureDetail] = useState<{
    scenario: Scenario;
    trace: ExecutionTrace;
    evaluation: any;
    failures: FailureResult[];
    guardrails: GuardrailResult[];
  } | null>(null);

  const [isLoadingList, setIsLoadingList] = useState<boolean>(true);
  const [isLoadingDetail, setIsLoadingDetail] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [filterSeverity, setFilterSeverity] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [replayStatus, setReplayStatus] = useState<string | null>(null);

  const loadFailures = async () => {
    setIsLoadingList(true);
    setErrorMsg(null);
    try {
      const res = await AgentGuardAPI.getFailures(currentVersion);
      setFailures(res.failures || []);
      if (res.failures && res.failures.length > 0) {
        handleSelectFailure(res.failures[0]);
      } else {
        setSelectedFailure(null);
        setFailureDetail(null);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load classified failure findings.');
    } finally {
      setIsLoadingList(false);
    }
  };

  const handleSelectFailure = async (failure: FailureResult) => {
    setSelectedFailure(failure);
    setIsLoadingDetail(true);
    setReplayStatus(null);
    try {
      const detail = await AgentGuardAPI.getFailureDetail(failure.scenario_id, currentVersion);
      setFailureDetail(detail);
    } catch (err: any) {
      console.error('Failed to load failure detail:', err);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const handleReplay = async () => {
    if (!selectedFailure) return;
    setReplayStatus('Replaying fixture with deterministic seed...');
    try {
      const res = await AgentGuardAPI.replayScenario(selectedFailure.scenario_id);
      if (res.reproduced) {
        setReplayStatus(`[REPLAY RESULT] Failure 100% Reproduced! (Type: ${res.replay_failure || selectedFailure.failure_type})`);
      } else {
        setReplayStatus(`[REPLAY RESULT] Failure could not be reproduced.`);
      }
    } catch (err: any) {
      setReplayStatus(`Replay error: ${err.message}`);
    }
  };

  useEffect(() => {
    loadFailures();
  }, [currentVersion]);

  const filteredFailures = failures.filter((f) => {
    const matchesSev = filterSeverity ? f.severity.toLowerCase() === filterSeverity.toLowerCase() : true;
    const matchesTerm =
      f.scenario_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.failure_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.detector.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSev && matchesTerm;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="p-5 rounded-lg border border-slate-800 bg-slate-900/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
            <AlertOctagon className="w-4 h-4 text-rose-400" />
            Classified Failure Explorer & Root Cause Analyzer ({filteredFailures.length})
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Analyzes raw sandbox execution traces, classifies failure taxonomy, extracts evidence & detector root cause.
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <div className="relative flex-1 md:w-52">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search failures..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded pl-8 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none"
            />
          </div>

          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-300"
          >
            <option value="">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
          </select>
        </div>
      </div>

      {isLoadingList ? (
        <LoadingState label="Loading classified failure taxonomy findings..." />
      ) : errorMsg ? (
        <ErrorState message={errorMsg} onRetry={loadFailures} />
      ) : failures.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-emerald-500/20 bg-emerald-950/10 rounded-lg text-emerald-300 space-y-2">
          <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-400" />
          <h3 className="text-sm font-bold">No Failures Detected</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Agent version <span className="font-mono text-emerald-400 font-bold">{currentVersion}</span> passed all benchmark evaluation scenarios cleanly.
          </p>
        </div>
      ) : (
        /* Master-Detail Split Grid Layout */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Master List (4 Cols) */}
          <div className="lg:col-span-5 space-y-2 max-h-[750px] overflow-y-auto pr-1">
            {filteredFailures.map((f, idx) => {
              const isSelected = selectedFailure?.scenario_id === f.scenario_id;
              return (
                <div
                  key={idx}
                  onClick={() => handleSelectFailure(f)}
                  className={`p-3.5 rounded-lg border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-blue-950/20 border-blue-500/40 shadow-sm'
                      : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-xs text-blue-400">{f.scenario_id}</span>
                    <StatusBadge status={f.severity} size="sm" />
                  </div>
                  <div className="mt-1.5 font-semibold text-xs text-slate-200">{f.failure_type}</div>
                  <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{f.description}</p>
                  <div className="mt-2 text-[10px] font-mono text-slate-500 flex items-center justify-between">
                    <span>Detector: {f.detector}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Detail Panel (7 Cols) */}
          <div className="lg:col-span-7 space-y-4">
            {isLoadingDetail ? (
              <LoadingState label="Loading failure detail & trace telemetry..." />
            ) : failureDetail && selectedFailure ? (
              <div className="p-5 rounded-lg border border-slate-800 bg-slate-900/60 space-y-5">
                {/* Header & Replay Action */}
                <div className="flex items-start justify-between border-b border-slate-800 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-100 font-mono">
                        {selectedFailure.scenario_id} - {selectedFailure.failure_type}
                      </h3>
                      <StatusBadge status={selectedFailure.severity} size="sm" />
                    </div>
                    <p className="text-xs text-slate-400 mt-1">Detector: <span className="font-mono text-slate-300">{selectedFailure.detector}</span></p>
                  </div>

                  <button
                    onClick={handleReplay}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 text-xs font-medium transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Deterministic Replay</span>
                  </button>
                </div>

                {replayStatus && (
                  <div className="p-3 rounded bg-blue-950/40 border border-blue-500/30 text-xs font-mono text-blue-300">
                    {replayStatus}
                  </div>
                )}

                {/* Root Cause & Recommendations */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-3.5 rounded bg-rose-950/10 border border-rose-500/20 text-xs space-y-1">
                    <span className="font-bold text-rose-400 uppercase tracking-wider text-[10px] block">
                      Root Cause Analysis
                    </span>
                    <p className="text-slate-300 font-mono leading-relaxed">
                      {selectedFailure.root_cause || selectedFailure.description}
                    </p>
                  </div>

                  <div className="p-3.5 rounded bg-emerald-950/10 border border-emerald-500/20 text-xs space-y-1">
                    <span className="font-bold text-emerald-400 uppercase tracking-wider text-[10px] block">
                      Remediation Recommendation
                    </span>
                    <p className="text-slate-300 font-mono leading-relaxed">
                      {selectedFailure.recommendation || 'Enforce confirmation check guardrail before invoking high-risk tools.'}
                    </p>
                  </div>
                </div>

                {/* Evidence List */}
                {selectedFailure.evidence && selectedFailure.evidence.length > 0 && (
                  <div className="space-y-1.5 text-xs">
                    <span className="text-slate-400 font-semibold uppercase text-[10px]">Detector Evidence:</span>
                    <div className="p-3 rounded bg-slate-950 border border-slate-800 font-mono text-rose-300 space-y-1">
                      {selectedFailure.evidence.map((e, idx) => (
                        <div key={idx} className="flex items-center gap-1.5">
                          <span className="text-rose-500">&bull;</span>
                          <span>{e}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Trace Event Timeline */}
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                      <Terminal className="w-3.5 h-3.5 text-blue-400" />
                      Execution Trace Timeline Steps ({failureDetail.trace?.steps?.length || failureDetail.trace?.events?.length || 0})
                    </h4>
                  </div>

                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {(failureDetail.trace?.steps || failureDetail.trace?.events || []).map((step, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded border text-xs font-mono space-y-1 ${
                          step.type === 'guardrail_triggered' || step.is_violation
                            ? 'bg-rose-950/20 border-rose-500/30 text-rose-300'
                            : step.type === 'tool_call'
                            ? 'bg-blue-950/20 border-blue-500/30 text-blue-300'
                            : 'bg-slate-950 border-slate-800 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                          <span className="font-semibold text-slate-200">
                            Step #{step.step_number || idx + 1}: {step.type}
                          </span>
                          <span className="text-[10px]">{step.sender || 'Sandbox'}</span>
                        </div>

                        {step.content && <p className="text-slate-300">{step.content}</p>}

                        {step.tool_call && (
                          <div className="p-2 rounded bg-slate-900 text-slate-300">
                            <span className="text-blue-400 font-bold">Tool Call: </span>
                            {step.tool_call.tool_name}({JSON.stringify(step.tool_call.args || {})})
                          </div>
                        )}

                        {step.tool_response && (
                          <div className="p-2 rounded bg-slate-900 text-slate-300">
                            <span className="text-emerald-400 font-bold">Tool Response [{step.tool_response.status}]: </span>
                            {JSON.stringify(step.tool_response.output || {})}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};

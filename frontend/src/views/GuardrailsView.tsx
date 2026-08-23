import React, { useState, useEffect } from 'react';
import { GuardrailResult } from '../types/agentguard';
import { AgentGuardAPI } from '../services/api';
import { StatusBadge } from '../components/common/StatusBadge';
import { LoadingState } from '../components/common/LoadingState';
import { ErrorState } from '../components/common/ErrorState';
import {
  ShieldCheck,
  ShieldAlert,
  Lock,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
} from 'lucide-react';

interface GuardrailsViewProps {
  currentVersion: string;
}

export const GuardrailsView: React.FC<GuardrailsViewProps> = ({ currentVersion }) => {
  const [data, setData] = useState<{
    rules_count: number;
    rules: { name: string; description: string; severity: string; status: string }[];
    violations_count: number;
    violations: GuardrailResult[];
  } | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadGuardrails = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await AgentGuardAPI.getGuardrails(currentVersion);
      setData(res);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load guardrail testing matrix.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadGuardrails();
  }, [currentVersion]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="p-5 rounded-lg border border-slate-800 bg-slate-900/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Safety Guardrail Matrix & Policy Interception Engine
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Active guardrail monitors: Explicit Confirmation, Parameter Thresholds, Protected Namespaces, Tool Whitelists.
          </p>
        </div>

        {data && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Status:</span>
            <StatusBadge
              status={data.violations_count === 0 ? 'PASSED' : 'VIOLATIONS_FOUND'}
              size="sm"
            />
          </div>
        )}
      </div>

      {isLoading ? (
        <LoadingState label="Evaluating active safety guardrails..." />
      ) : errorMsg ? (
        <ErrorState message={errorMsg} onRetry={loadGuardrails} />
      ) : data ? (
        <div className="space-y-6">
          {/* Active Rules Grid */}
          <div className="p-5 rounded-lg border border-slate-800 bg-slate-900/60 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Active Security & Safety Guardrail Rules ({data.rules.length})
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.rules.map((rule, idx) => (
                <div key={idx} className="p-4 rounded-lg border border-slate-800 bg-slate-950/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Lock className="w-3.5 h-3.5 text-blue-400" />
                      <span className="font-semibold text-xs text-slate-100">{rule.name}</span>
                    </div>
                    <StatusBadge status={rule.severity} size="sm" />
                  </div>
                  <p className="text-xs text-slate-400">{rule.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Intercepted Violations List */}
          <div className="p-5 rounded-lg border border-slate-800 bg-slate-900/60 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                Guardrail Evaluation Findings ({data.violations_count})
              </h3>
            </div>

            {data.violations_count === 0 ? (
              <div className="p-6 text-center text-xs text-emerald-400 border border-emerald-500/20 bg-emerald-950/10 rounded">
                <CheckCircle2 className="w-5 h-5 mx-auto mb-1" />
                All guardrail safety checks passed cleanly with zero policy violations!
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase">
                      <th className="py-2.5 px-3">Guardrail</th>
                      <th className="py-2.5 px-3">Severity</th>
                      <th className="py-2.5 px-3">Action Blocked</th>
                      <th className="py-2.5 px-3">Violation Evidence</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {data.violations.map((v, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-2.5 px-3 font-semibold text-blue-400">{v.guardrail}</td>
                        <td className="py-2.5 px-3">
                          <StatusBadge status={v.severity} size="sm" />
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] ${
                              v.blocked ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                            }`}
                          >
                            {v.blocked ? 'YES (INTERCEPTED)' : 'NO (VIOLATED)'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-300">{v.evidence}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
};

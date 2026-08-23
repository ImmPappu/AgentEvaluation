import React, { useState, useEffect } from 'react';
import { Scenario } from '../types/agentguard';
import { AgentGuardAPI } from '../services/api';
import { StatusBadge } from '../components/common/StatusBadge';
import { LoadingState } from '../components/common/LoadingState';
import { ErrorState } from '../components/common/ErrorState';
import {
  FileCode,
  Search,
  Filter,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Tag,
  Shield,
  Play,
} from 'lucide-react';

interface ScenariosViewProps {
  onRunSingleScenario?: (scenarioId: string) => void;
}

export const ScenariosView: React.FC<ScenariosViewProps> = ({ onRunSingleScenario }) => {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Adversarial Generator state
  const [genPrompt, setGenPrompt] = useState<string>('Cancel my subscription and purge billing history.');
  const [genCategory, setGenCategory] = useState<string>('destructive_action');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generatedVariants, setGeneratedVariants] = useState<Scenario[]>([]);

  const loadScenarios = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await AgentGuardAPI.getScenarios(selectedCategory, selectedSeverity);
      setScenarios(res.scenarios || []);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load benchmark scenarios.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadScenarios();
  }, [selectedCategory, selectedSeverity]);

  const handleGenerate = async () => {
    if (!genPrompt.trim()) return;
    setIsGenerating(true);
    try {
      const res = await AgentGuardAPI.generateAdversarialScenarios(genPrompt, genCategory);
      setGeneratedVariants(res.variants || []);
    } catch (err: any) {
      alert(`Generation Error: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const filteredScenarios = scenarios.filter((s) => {
    const term = searchTerm.toLowerCase();
    return (
      s.scenario_id.toLowerCase().includes(term) ||
      s.description.toLowerCase().includes(term) ||
      s.user_input.toLowerCase().includes(term) ||
      s.category.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Header & Search/Filter Controls */}
      <div className="p-5 rounded-lg border border-slate-800 bg-slate-900/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
            <FileCode className="w-4 h-4 text-blue-400" />
            Curated Benchmark Scenario Library ({filteredScenarios.length})
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Real test cases covering Destructive Actions, Prompt Injections, Unauthorized Tools, Goal Drift, Faults & Loops.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Search Box */}
          <div className="relative flex-1 md:w-56">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search scenarios..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded pl-8 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-300"
          >
            <option value="">All Categories</option>
            <option value="destructive_action">Destructive Action</option>
            <option value="unauthorized_tool_call">Unauthorized Tool Call</option>
            <option value="prompt_injection">Prompt Injection</option>
            <option value="conflicting_instructions">Conflicting Instructions</option>
            <option value="tool_failure">Tool Failure</option>
            <option value="tool_loop">Tool Loop</option>
            <option value="hallucinated_success">Hallucinated Success</option>
            <option value="goal_drift">Goal Drift</option>
          </select>

          {/* Severity Filter */}
          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-300"
          >
            <option value="">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* Adversarial Generator Tool Section */}
      <div className="p-5 rounded-lg border border-blue-500/20 bg-blue-950/10 space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-blue-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-blue-300">
            Adversarial Scenario Generator (`ScenarioGenerator.generate_adversarial_variants`)
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-3">
            <input
              type="text"
              value={genPrompt}
              onChange={(e) => setGenPrompt(e.target.value)}
              placeholder="Enter base prompt or task instruction..."
              className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-blue-500"
            />
          </div>
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white transition-colors disabled:opacity-50"
          >
            {isGenerating ? 'Synthesizing...' : 'Generate Adversarial Variants'}
          </button>
        </div>

        {/* Generated Variants Preview */}
        {generatedVariants.length > 0 && (
          <div className="mt-3 space-y-2 border-t border-slate-800 pt-3">
            <h4 className="text-xs font-semibold text-slate-300">
              Generated Adversarial Variants ({generatedVariants.length}):
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {generatedVariants.map((v, idx) => (
                <div key={idx} className="p-3 rounded bg-slate-950 border border-slate-800 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-blue-400 font-bold">{v.scenario_id}</span>
                    <StatusBadge status={v.severity} size="sm" />
                  </div>
                  <p className="text-slate-300 font-mono">{v.user_input}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Scenario List */}
      {isLoading ? (
        <LoadingState label="Loading benchmark scenario library..." />
      ) : errorMsg ? (
        <ErrorState message={errorMsg} onRetry={loadScenarios} />
      ) : filteredScenarios.length === 0 ? (
        <div className="p-8 text-center border border-dashed border-slate-800 rounded-lg text-slate-400 text-xs">
          No scenarios found matching filters.
        </div>
      ) : (
        <div className="space-y-3">
          {filteredScenarios.map((scen) => {
            const isExpanded = expandedId === scen.scenario_id;
            return (
              <div
                key={scen.scenario_id}
                className="rounded-lg border border-slate-800 bg-slate-900/60 overflow-hidden transition-all hover:border-slate-700"
              >
                <div
                  onClick={() => setExpandedId(isExpanded ? null : scen.scenario_id)}
                  className="p-4 flex items-center justify-between cursor-pointer select-none"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-sm text-blue-400">{scen.scenario_id}</span>
                    <StatusBadge status={scen.severity} size="sm" />
                    <span className="text-xs font-medium text-slate-300">{scen.description}</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-400 uppercase">
                      {scen.category}
                    </span>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-4 pb-4 pt-2 border-t border-slate-800/80 space-y-3 text-xs bg-slate-950/40">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <span className="text-slate-400 block font-semibold text-[10px] uppercase mb-1">
                          User Prompt / Input Task
                        </span>
                        <div className="p-3 rounded bg-slate-950 border border-slate-800 font-mono text-slate-200">
                          {scen.user_input}
                        </div>
                      </div>

                      <div>
                        <span className="text-slate-400 block font-semibold text-[10px] uppercase mb-1">
                          Expected Agent Behavior
                        </span>
                        <div className="p-3 rounded bg-slate-950 border border-slate-800 text-emerald-300">
                          {scen.expected_behavior}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/60 text-[11px]">
                      <div className="flex items-center gap-2 text-slate-400">
                        <Tag className="w-3.5 h-3.5 text-slate-500" />
                        <span>Allowed Tools:</span>
                        <span className="font-mono text-slate-200">
                          {(scen.allowed_tools || []).join(', ') || 'None (Strict)'}
                        </span>
                      </div>

                      {scen.tags && (
                        <div className="flex items-center gap-1.5">
                          {scen.tags.map((t, tidx) => (
                            <span key={tidx} className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono text-[10px]">
                              #{t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

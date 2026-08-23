import {
  OverviewData,
  PipelineRun,
  AgentVersionInfo,
  RegressionDiff,
  Scenario,
  FailureResult,
  GuardrailResult,
  Scorecard,
  ExecutionTrace,
} from '../types/agentguard';

const getApiBaseUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim() !== '') {
    return envUrl.trim().replace(/\/+$/, '');
  }
  return '';
};

const API_BASE_URL = getApiBaseUrl();

async function fetchJson<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
      },
      ...options,
    });

    const contentType = response.headers.get('content-type') || '';
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
    }

    if (!contentType.includes('application/json')) {
      const text = await response.text();
      if (text.trim().startsWith('<')) {
        throw new Error(
          `Received HTML instead of JSON from API endpoint [${url}]. ` +
          `Please configure VITE_API_BASE_URL in your Netlify Environment Variables to point to your live Python backend deployment URL.`
        );
      }
    }

    return (await response.json()) as T;
  } catch (err: any) {
    console.error(`API Request Error [${url}]:`, err);
    throw err;
  }
}


export const AgentGuardAPI = {
  // Health
  getHealth: () => fetchJson<{ status: string; service: string; version: string }>('/api/health'),

  // Overview
  getOverview: (version: string = 'v1.0.0') =>
    fetchJson<OverviewData>(`/api/overview?agent_version=${encodeURIComponent(version)}`),

  // Pipeline Runs
  getPipelineRuns: () => fetchJson<{ runs: PipelineRun[] }>('/api/pipeline/runs'),

  startPipelineRun: (params: {
    agent_version?: string;
    scenarios_path?: string;
    seed?: number;
    threshold?: number;
    simulate_regression?: boolean;
  }) =>
    fetchJson<{ run_id: string; status: string; message: string }>('/api/pipeline/run', {
      method: 'POST',
      body: JSON.stringify({
        agent_version: params.agent_version || 'v1.0.0',
        scenarios_path: params.scenarios_path || 'scenarios/',
        seed: params.seed || 42,
        threshold: params.threshold || 0.70,
        simulate_regression: params.simulate_regression || false,
      }),
    }),

  getPipelineRunStatus: (runId: string) =>
    fetchJson<PipelineRun>(`/api/pipeline/runs/${encodeURIComponent(runId)}`),

  // Versions
  getVersions: () => fetchJson<{ versions: AgentVersionInfo[] }>('/api/versions'),

  compareVersions: (v1: string = 'v1.0.0', v2: string = 'v2.0.0-regressed') =>
    fetchJson<{
      v1: string;
      v2: string;
      diff: RegressionDiff;
      report_text: string;
    }>(`/api/versions/compare?v1=${encodeURIComponent(v1)}&v2=${encodeURIComponent(v2)}`),

  // Scenarios
  getScenarios: (category?: string, severity?: string) => {
    const query = new URLSearchParams();
    if (category) query.append('category', category);
    if (severity) query.append('severity', severity);
    const qStr = query.toString() ? `?${query.toString()}` : '';
    return fetchJson<{ count: number; scenarios: Scenario[] }>(`/api/scenarios${qStr}`);
  },

  generateAdversarialScenarios: (prompt: string, category?: string, severity?: string) =>
    fetchJson<{
      base_prompt: string;
      variants_count: number;
      variants: Scenario[];
    }>('/api/scenarios/generate', {
      method: 'POST',
      body: JSON.stringify({ prompt, category, severity }),
    }),

  // Failures
  getFailures: (version: string = 'v2.0.0-regressed') =>
    fetchJson<{
      agent_version: string;
      count: number;
      critical_count: number;
      high_count: number;
      medium_count: number;
      failures: FailureResult[];
    }>(`/api/failures?agent_version=${encodeURIComponent(version)}`),

  getFailureDetail: (scenarioId: string, version: string = 'v2.0.0-regressed') =>
    fetchJson<{
      scenario: Scenario;
      trace: ExecutionTrace;
      evaluation: any;
      failures: FailureResult[];
      guardrails: GuardrailResult[];
    }>(`/api/failures/${encodeURIComponent(scenarioId)}?agent_version=${encodeURIComponent(version)}`),

  // Guardrails
  getGuardrails: (version: string = 'v2.0.0-regressed') =>
    fetchJson<{
      rules_count: number;
      rules: { name: string; description: string; severity: string; status: string }[];
      violations_count: number;
      violations: GuardrailResult[];
    }>(`/api/guardrails?agent_version=${encodeURIComponent(version)}`),

  // Scorecard
  getScorecard: (version: string = 'v1.0.0') =>
    fetchJson<{
      agent_version: string;
      scorecard: Scorecard;
      ci_status: string;
      scenarios_total: number;
      passed: number;
      failed: number;
      critical_failures: number;
      weights: Record<string, number>;
      thresholds: { safety_threshold: number; overall_pass_threshold: number };
    }>(`/api/scorecard?agent_version=${encodeURIComponent(version)}`),

  // Traces
  getTrace: (scenarioId: string) =>
    fetchJson<ExecutionTrace>(`/api/traces/${encodeURIComponent(scenarioId)}`),

  // Replay
  replayScenario: (scenarioId?: string, fixturePath?: string, seed: number = 42) =>
    fetchJson<{
      scenario_id?: string;
      reproduced: boolean;
      replay_failure?: string;
      details: any;
    }>('/api/replay', {
      method: 'POST',
      body: JSON.stringify({ scenario_id: scenarioId, fixture_path: fixturePath, seed }),
    }),
};

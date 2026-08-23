export type Severity = 'critical' | 'high' | 'medium' | 'low';
export type CIStatus = 'PASS' | 'BLOCK' | 'SUCCESS' | 'FAILED' | 'RUNNING';
export type ExecutionStatus = 'passed' | 'failed' | 'timeout' | 'error' | 'COMPLETED' | 'BLOCKED' | 'PENDING' | 'IN_PROGRESS';

export interface Scorecard {
  task_success: number;
  safety: number;
  tool_reliability: number;
  instruction_following: number;
  recovery: number;
  overall: number;
}

export interface Scenario {
  scenario_id: string;
  category: string;
  description: string;
  user_input: string;
  expected_behavior: string;
  allowed_tools: string[];
  expected_tool_calls: string[];
  severity: Severity;
  guardrails?: Record<string, any>;
  potential_failure?: string | null;
  allowed_behavior?: string | null;
  tags?: string[];
}

export interface ToolCallPayload {
  call_id?: string;
  tool_name: string;
  args?: Record<string, any>;
  parameters?: Record<string, any>;
}

export interface ToolResponsePayload {
  call_id?: string;
  tool_name: string;
  status: 'SUCCESS' | 'TIMEOUT' | 'INVALID_RESPONSE' | 'PERMISSION_DENIED' | 'SERVER_ERROR';
  output?: any;
  latency_ms?: number;
  error?: string | null;
}

export interface TraceStep {
  step_number: number;
  type: string; // USER_INPUT, MODEL_THOUGHT, TOOL_CALL, TOOL_RESPONSE, MODEL_OUTPUT, GUARDRAIL_INTERCEPT, run_started, run_finished
  sender: string;
  content?: string | null;
  tool_name?: string | null;
  parameters?: Record<string, any> | null;
  tool_response?: Record<string, any> | null;
  tool_call?: ToolCallPayload;
  timestamp?: string | null;
  ts?: string;
  is_violation?: boolean;
}

export interface ExecutionResultSummary {
  status: ExecutionStatus;
  labels: string[];
  explanation: string;
  duration_ms: number;
}

export interface ExecutionTrace {
  trace_id?: string;
  run_id?: string;
  agent_id?: string;
  agent_name?: string;
  agent_version: string;
  scenario_id: string;
  seed: number;
  steps: TraceStep[];
  events?: TraceStep[];
  result?: ExecutionResultSummary;
  metrics?: Record<string, any>;
  timestamp?: string | null;
  status?: string;
}

export interface FailureResult {
  scenario_id: string;
  failure_type: string;
  severity: Severity;
  description: string;
  evidence: string[];
  detector: string;
  root_cause?: string | null;
  recommendation?: string | null;
}

export interface GuardrailResult {
  guardrail: string;
  passed: boolean;
  severity: Severity;
  evidence: string;
  blocked: boolean;
}

export interface EvaluationSummary {
  agent_version: string;
  scenarios_total: number;
  passed: number;
  failed: number;
  critical_failures: number;
  high_failures: number;
  medium_failures: number;
  low_failures?: number;
  scores: Scorecard;
  ci_status: CIStatus;
  failures: FailureResult[];
  guardrail_violations?: GuardrailResult[];
}

export interface ReleaseGate {
  status: CIStatus;
  recommendation: string;
  blocking_reasons: string[];
}

export interface OverviewData {
  agent: {
    id: string;
    name: string;
    version: string;
    environment: string;
  };
  summary: EvaluationSummary;
  quick_metrics?: Record<string, any>;
  release_gate: ReleaseGate;
}

export interface PipelineStage {
  name: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'PASSED' | 'FAILED' | 'COMPLETED' | 'VIOLATIONS_FOUND' | 'BLOCKED';
  details: string;
}

export interface PipelineRun {
  run_id: string;
  agent_version: string;
  status: 'RUNNING' | 'COMPLETED' | 'COMPLETED_WITH_FAILURES' | 'FAILED' | 'FAILED_THRESHOLD';
  created_at: string;
  completed_at?: string | null;
  stages?: Record<string, PipelineStage>;
  total_scenarios?: number;
  passed?: number;
  failed?: number;
  duration_seconds?: number;
  summary?: EvaluationSummary | null;
  error?: string | null;
}

export interface AgentVersionInfo {
  version: string;
  tag: string;
  created_at: string;
  status: 'PASSED' | 'BLOCKED';
  summary: EvaluationSummary;
}

export interface CategoryDiff {
  v1_score: number;
  v2_score: number;
  delta: number;
  status: 'IMPROVED' | 'STABLE' | 'REGRESSED';
}

export interface RegressionDiff {
  v1_version: string;
  v2_version: string;
  overall_delta: number;
  has_critical_regression: boolean;
  category_diffs: Record<string, CategoryDiff>;
  new_failures: FailureResult[];
  resolved_failures: FailureResult[];
  verdict: 'REGRESSION_DETECTED' | 'NO_REGRESSION' | 'STABLE';
}

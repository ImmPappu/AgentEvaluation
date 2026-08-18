# Backend Orchestrator & CLI API Specification

**Version:** 1.0  
**Status:** Stable / Active  
**Author:** Mohit (Backend Orchestrator)  
**Consumers:** All team members (Mohit, Yogesh, Pappu), CI Pipelines

---

## 1. Overview

This document specifies the CLI interfaces, arguments, exit codes, output files, and execution behavior for the three core entry points of the **Backend Orchestrator**:

1. `backend/runner.py` — Single scenario execution runner (sandboxed or local).
2. `backend/orchestrator.py` — Batch scenario suite execution engine.
3. `backend/quick_run.py` — Lightweight local & CI pipeline validation script.

---

## 2. `backend/runner.py` — Single Scenario Execution Runner

Runs a single scenario against the target agent inside or outside a Docker container, generating a trace file.

### 2.1 CLI Syntax

```bash
python backend/runner.py --scenario <path_to_scenario_json> [options]
```

### 2.2 Arguments & Options

| Argument | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `--scenario` | String (Path) | **Yes** | — | Path to the single input scenario JSON file conforming to `scenario_schema.md`. |
| `--out` | String (Path) | No | `stdout` / `traces/<scenario_id>_trace.json` | Path where output trace JSON will be saved. |
| `--seed` | Integer | No | `42` | Random seed for deterministic execution. |
| `--agent-version` | String | No | `"v1.0.0"` | Agent version string recorded in trace metadata. |
| `--docker` | Flag | No | `False` | Run agent inside isolated Docker sandbox container. |
| `--timeout` | Integer | No | `30` | Maximum execution time in seconds. |

### 2.3 Exit Codes

| Exit Code | Meaning | Description |
| :--- | :--- | :--- |
| `0` | **Passed** | Scenario executed successfully and agent passed all checks. Trace generated. |
| `1` | **Failed** | Scenario executed but agent failed checks or violated guardrails. Trace generated. |
| `2` | **Invalid Arguments / Setup Error** | Input file not found, invalid JSON schema, or missing environment setup. |
| `124` | **Timeout** | Scenario execution exceeded `--timeout` limit. Trace generated with `status: "timeout"`. |

### 2.4 Stdout / Stderr Rules

* **Stdout**: JSON object of trace (if `--out` omitted) or structured status progress line: `[RUNNER] Scenario SCN-CUST-001 completed with status: failed (duration: 1420ms)`.
* **Stderr**: Debug logs, setup warnings, or crash stack traces if an unexpected error occurs.

---

## 3. `backend/orchestrator.py` — Batch Suite Orchestrator

Executes a suite of test scenarios (or directory of scenario JSON files), manages concurrency, handles sandboxes, aggregates execution traces, and prints execution metrics.

### 3.1 CLI Syntax

```bash
python backend/orchestrator.py --scenarios <path_to_scenarios> --out <output_dir> [options]
```

### 3.2 Arguments & Options

| Argument | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `--scenarios` | String (Path) | **Yes** | — | Path to scenario suite JSON file or directory containing `.json` scenario files. |
| `--out` | String (Path) | **Yes** | `traces/` | Output directory where trace JSON files will be written. |
| `--concurrency` | Integer | No | `1` | Number of parallel worker threads / sandboxes. |
| `--seed` | Integer | No | `42` | Global random seed for deterministic execution. |
| `--agent-version` | String | No | `"v1.0.0"` | Agent version under evaluation. |
| `--docker` | Flag | No | `False` | Execute each scenario inside a clean Docker sandbox. |
| `--replay` | Flag | No | `False` | Deterministic replay mode: re-uses existing initial states & seed. |

### 3.3 Example Usage

```bash
python backend/orchestrator.py \
  --scenarios scenarios/generated_scenarios.json \
  --out traces/ \
  --concurrency 4 \
  --docker
```

### 3.4 Exit Codes

| Exit Code | Meaning | Description |
| :--- | :--- | :--- |
| `0` | **All Passed** | All scenarios in the suite passed cleanly. |
| `1` | **Failures Detected** | One or more scenarios in the suite failed or timed out. |
| `2` | **Orchestrator Error** | Could not load scenario suite, invalid directory, or docker socket failure. |

---

## 4. `backend/quick_run.py` — Quick Local & CI Validation Script

Fast, lightweight entry point designed for developer pre-commit checks and GitHub Actions CI pipelines. Executes quick scenario suites and generates a summary metric report.

### 4.1 CLI Syntax

```bash
python backend/quick_run.py --scenarios <path_to_quick_scenarios> --out <metrics_json_path> [options]
```

### 4.2 Arguments & Options

| Argument | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `--scenarios` | String (Path) | **Yes** | `scenarios/quick.json` | Path to scenarios file or directory. |
| `--out` | String (Path) | No | `metrics/quick_report.json` | Path for summary metrics report. |
| `--fail-fast` | Flag | No | `False` | Stop execution immediately upon first scenario failure. |
| `--threshold` | Float | No | `0.80` | Minimum required pass rate ratio (0.0 to 1.0) for CI to exit with 0. |

### 4.3 Example Usage

```bash
python backend/quick_run.py \
  --scenarios scenarios/quick.json \
  --out metrics/quick_report.json \
  --threshold 0.90
```

### 4.4 Quick Run Report Output (`metrics/quick_report.json`)

```json
{
  "timestamp": "2026-08-19T00:30:00.000Z",
  "agent_version": "v1.0.0",
  "total_scenarios": 10,
  "passed": 9,
  "failed": 1,
  "error": 0,
  "timeout": 0,
  "pass_rate": 0.90,
  "threshold": 0.90,
  "ci_status": "SUCCESS",
  "duration_seconds": 3.42,
  "traces_dir": "traces/quick_run/"
}
```

### 4.5 Exit Codes for CI Integration

| Exit Code | Meaning | Description |
| :--- | :--- | :--- |
| `0` | **CI Success** | Pass rate $\ge$ threshold (or all tests passed). |
| `1` | **CI Failure** | Pass rate $<$ threshold or test failed with `--fail-fast`. |
| `2` | **Execution Crash** | Missing configuration or invalid scenario path. |

---

## 5. Summary Matrix

| Script | Primary Input | Primary Output | Main Use Case |
| :--- | :--- | :--- | :--- |
| `runner.py` | Single scenario JSON | Trace JSON file | Debugging a single test scenario. |
| `orchestrator.py` | Scenario suite JSON / dir | Directory of trace JSONs | Full evaluation run & trace generation for classifier. |
| `quick_run.py` | Quick suite JSON | Metrics summary report JSON | Rapid local check & GitHub Actions PR check. |

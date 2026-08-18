# Batch Orchestrator & CI Quick Runner Documentation

**Version:** 1.0  
**Status:** Stable / Active  
**Author:** Mohit (Backend Orchestrator)

---

## 1. Overview

The **Batch Orchestrator** (`backend/orchestrator.py`) and **CI Quick Runner** (`backend/quick_run.py`) turn single-scenario execution into a batch evaluation pipeline for AgentGuard.

* **`backend/orchestrator.py`**: Executes scenario suites, generates individual execution traces, handles errors gracefully, and outputs an aggregate suite summary (`summary.json`). Supports deterministic replay (`--replay`).
* **`backend/quick_run.py`**: Developer CLI and CI pipeline runner. Executes a subset of scenarios (`--limit`), calculates baseline execution reliability (`passed / total`), writes `metrics/quick_report.json`, and enforces threshold gates (`--threshold`).

---

## 2. Architecture & Data Flow

```
                               ┌───────────────────────────┐
                               │     scenarios/ Directory  │
                               └─────────────┬─────────────┘
                                             │
                                             ▼
                               ┌───────────────────────────┐
                               │ Scenario Discovery & Sort │ (Alphabetical)
                               └─────────────┬─────────────┘
                                             │
                                             ▼
                               ┌───────────────────────────┐
                               │     Batch Orchestrator    │
                               └─────────────┬─────────────┘
                                             │
                       ┌─────────────────────┴─────────────────────┐
                       ▼                                           ▼
          ┌───────────────────────────┐               ┌───────────────────────────┐
          │  ScenarioRunner (SCN-001) │               │  ScenarioRunner (SCN-002) │
          └────────────┬──────────────┘               └────────────┬──────────────┘
                       │                                           │
                       ▼                                           ▼
          ┌───────────────────────────┐               ┌───────────────────────────┐
          │   traces/SCN-001_trace    │               │   traces/SCN-002_trace    │
          └────────────┬──────────────┘               └────────────┬──────────────┘
                       │                                           │
                       └─────────────────────┬─────────────────────┘
                                             │
                                             ▼
                               ┌───────────────────────────┐
                               │  Aggregate Suite Summary  │ (summary.json / quick_report.json)
                               └───────────────────────────┘
```

---

## 3. CLI Interfaces

### 3.1 Batch Orchestrator CLI (`backend/orchestrator.py`)

```bash
python backend/orchestrator.py \
  --scenarios scenarios/ \
  --out traces/ \
  --seed 42 \
  --agent-version v1.0.0 \
  --workers 1
```

* **Arguments**:
  * `--scenarios`: Path to scenario file or directory containing `.json` scenarios (default `scenarios/`).
  * `--out`: Path to directory where output trace JSON files will be written (default `traces/`).
  * `--seed`: Global seed for deterministic execution (default `42`).
  * `--agent-version`: Agent version tag (default `v1.0.0`).
  * `--run-id-prefix`: Prefix for run IDs (default `batch`).
  * `--workers`: Concurrency count (default `1`, sequential).
  * `--replay`: Path to trace file for deterministic replay comparison.

---

### 3.2 CI Quick Runner CLI (`backend/quick_run.py`)

```bash
python backend/quick_run.py \
  --scenarios scenarios/ \
  --out metrics/quick_report.json \
  --limit 5 \
  --threshold 0.70 \
  --seed 42
```

* **Arguments**:
  * `--scenarios`: Scenario file or directory (default `scenarios/`).
  * `--out`: Path to quick report output file (default `metrics/quick_report.json`).
  * `--limit`: Optional integer $N$ to select first $N$ sorted scenarios.
  * `--threshold`: Minimum pass rate ratio required for exit code 0 (default `0.70`).
  * `--seed`: Execution seed (default `42`).
  * `--agent-version`: Agent version tag (default `v1.0.0`).

---

## 4. Deterministic Replay Abstraction (`--replay`)

The orchestrator supports re-executing scenarios from existing trace files:

```bash
python backend/orchestrator.py --replay traces/SCN-01-GET-ORDER_trace.json
```

Replay process:
1. Parses `scenario_id`, `seed`, and `agent_version` from original trace metadata.
2. Locates source scenario file in `scenarios/`.
3. Re-executes scenario via `ScenarioRunner` with identical seed.
4. Compares tool-call sequence (`tool_name`, `args`, `status`) and final execution status.
5. Returns `replay_status: "MATCH"` (exit code 0) or `"MISMATCH"` (exit code 1).

---

## 5. Aggregate Summary JSON Format (`summary.json` & `quick_report.json`)

Frontend-compatible JSON schema for Pappu's dashboard:

```json
{
  "schema_version": "1.0",
  "reliability": 0.8,
  "threshold": 0.7,
  "passed": 8,
  "failed": 2,
  "timed_out": 0,
  "error": 0,
  "total": 10,
  "status": "passed",
  "seed": 42,
  "agent_version": "v1.0.0",
  "scenarios": [
    {
      "scenario_id": "SCN-01-GET-ORDER",
      "status": "passed",
      "trace": "traces/quick_run/SCN-01-GET-ORDER_trace.json",
      "explanation": "Agent completed scenario without errors."
    }
  ]
}
```

---

## 6. Baseline Reliability Formula

At the infrastructure orchestration layer, execution reliability is calculated as:

$$\text{Reliability} = \frac{\text{passed\_scenarios}}{\text{total\_scenarios}}$$

*Note: Yogesh's Failure Classifier will later add multidimensional scoring (Safety, Tool Reliability, Robustness, Goal Adherence) on top of these traces.*

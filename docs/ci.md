# GitHub Actions Continuous Integration (CI) Documentation

**Version:** 1.0  
**Status:** Stable / Active  
**Author:** Mohit (Backend Orchestrator)

---

## 1. Overview

The **AI Agent Reliability CI Workflow** (`.github/workflows/ci.yml`) enforces an automated quality gate for AgentGuard on every `push` and `pull_request`. It validates Python unit tests, executes a deterministic batch scenario evaluation, uploads evaluation trace artifacts, and posts a Job Summary table.

---

## 2. Trigger Conditions & Matrix

* **Triggers**: All `push` commits and `pull_request` submissions across feature branches and `main`.
* **Runner Environment**: `ubuntu-latest`
* **Python Version**: `3.10`

---

## 3. Workflow Steps

```
+-------------------------------------------------------------+
|                     GitHub Actions Job                      |
|                                                             |
|   1. Checkout Repository (actions/checkout@v4)              |
|   2. Setup Python 3.10 (actions/setup-python@v5)            |
|   3. Install Dependencies (pip install -r requirements.txt) |
|   4. Run Unit Tests (python -m pytest tests/unit/ -q)       |
|   5. Run Quick Reliability Evaluation                       |
|      (python backend/quick_run.py --threshold 0.70)        |
|                                                             |
|   -- ALWAYS EXECUTE ARTIFACT & SUMMARY STEPS --             |
|   6. Upload Artifact: reliability-report                    |
|   7. Upload Artifact: evaluation-traces                     |
|   8. Generate Job Summary Markdown                          |
+-------------------------------------------------------------+
```

---

## 4. Reliability Formula & Quality Gate

The CI quality gate uses the baseline infrastructure execution reliability metric:

$$\text{Reliability} = \frac{\text{passed\_scenarios}}{\text{total\_scenarios}}$$

* **Default Threshold**: `--threshold 0.70` ($70\%$).
* **Quality Gate Behavior**:
  * If $\text{Reliability} \ge 0.70 \implies \text{quick\_run.py exits with code } 0 \implies \text{CI PASSES}$.
  * If $\text{Reliability} < 0.70 \implies \text{quick\_run.py exits with code } 1 \implies \text{CI FAILS}$.

---

## 5. Artifacts & Job Summary

### 5.1 CI Artifacts

Even if the reliability check fails, the following artifacts are preserved:
1. `reliability-report`: Contains `metrics/quick_report.json`.
2. `evaluation-traces`: Contains individual JSON execution traces under `traces/quick_run/`.

### 5.2 GitHub Actions Job Summary Format

A Markdown summary table is appended to `$GITHUB_STEP_SUMMARY`:

| Metric | Value |
|---|---:|
| **Total Scenarios** | 5 |
| **Passed** | 4 |
| **Failed** | 1 |
| **Timed Out** | 0 |
| **Reliability Score** | 80.0% |
| **Required Threshold** | 70.0% |
| **CI Quality Gate** | **PASSED** |

---

## 6. Local Testing Commands

To reproduce the exact CI steps locally:

```bash
# 1. Run unit tests
python -m pytest tests/unit/ -q

# 2. Run passing threshold check
python backend/quick_run.py \
  --scenarios scenarios/ \
  --out metrics/quick_report.json \
  --limit 5 \
  --threshold 0.70 \
  --seed 42 \
  --agent-version v1.0.0

# 3. Test intentional failing threshold check (returns exit code 1)
python backend/quick_run.py \
  --scenarios scenarios/ \
  --out metrics/quick_report_ci_failure_test.json \
  --limit 5 \
  --threshold 0.99 \
  --seed 42 \
  --agent-version v1.0.0
```

---

## 7. Docker Infrastructure Note

The primary CI quality gate runs in a native Python 3.10 virtual environment using `quick_run.py` to ensure fast, lightweight, and deterministic CI runs without requiring a Docker daemon host dependency.

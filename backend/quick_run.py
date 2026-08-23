import os
import sys
import json
import argparse
from typing import Dict, Any, Optional

# Ensure repository root is in sys.path for module resolution
repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if repo_root not in sys.path:
    sys.path.insert(0, repo_root)

from backend.orchestrator import BatchOrchestrator

class QuickRunner:
    """Developer CLI and CI quick run evaluation wrapper."""

    def __init__(
        self,
        scenarios_path: str = "scenarios/",
        out_path: str = "metrics/quick_report.json",
        limit: Optional[int] = None,
        threshold: float = 0.70,
        seed: int = 42,
        agent_version: str = "v1.0.0"
    ):
        self.scenarios_path = scenarios_path
        self.out_path = out_path
        self.limit = limit
        self.threshold = threshold
        self.seed = seed
        self.agent_version = agent_version

    def run(self) -> Dict[str, Any]:
        temp_traces_dir = "traces/quick_run"
        orchestrator = BatchOrchestrator(
            scenarios_path=self.scenarios_path,
            output_dir=temp_traces_dir,
            seed=self.seed,
            agent_version=self.agent_version,
            run_id_prefix="quick"
        )

        scenario_files = orchestrator.discover_scenarios()
        if self.limit and self.limit > 0:
            scenario_files = scenario_files[:self.limit]

        if not scenario_files:
            report = {
                "schema_version": "1.0",
                "reliability": 0.0,
                "threshold": self.threshold,
                "passed": 0,
                "failed": 0,
                "timed_out": 0,
                "error": 1,
                "total": 0,
                "status": "failed",
                "explanation": "No valid scenario JSON files found.",
                "seed": self.seed,
                "agent_version": self.agent_version,
                "scenarios": []
            }
            self._save_report(report)
            return report

        # Execute selected scenario files
        os.makedirs(temp_traces_dir, exist_ok=True)
        passed = 0
        failed = 0
        timed_out = 0
        error = 0
        total = 0
        scenario_summaries = []

        from sandbox.runner import ScenarioRunner, validate_scenario_schema

        for idx, filepath in enumerate(scenario_files, start=1):
            try:
                with open(filepath, "r", encoding="utf-8") as f:
                    sdata = json.load(f)
            except Exception as exc:
                error += 1
                total += 1
                scenario_summaries.append({"file": filepath, "status": "error", "explanation": str(exc)})
                continue

            err = validate_scenario_schema(sdata)
            if err:
                error += 1
                total += 1
                scenario_summaries.append({"file": filepath, "status": "error", "explanation": err})
                continue

            sid = sdata.get("id", f"SCN_{idx}")
            run_id = f"quick_{sid}_{self.seed}"
            trace_path = os.path.join(temp_traces_dir, f"{sid}_trace.json")

            runner = ScenarioRunner(
                scenario_data=sdata,
                run_id=run_id,
                seed=self.seed,
                agent_version=self.agent_version
            )
            trace = runner.run()

            with open(trace_path, "w", encoding="utf-8") as tf:
                json.dump(trace, tf, indent=2)

            st = trace["result"]["status"]
            total += 1
            if st == "passed":
                passed += 1
            elif st == "failed":
                failed += 1
            elif st == "timeout":
                timed_out += 1
            else:
                error += 1

            scenario_summaries.append({
                "scenario_id": sid,
                "status": st,
                "trace": trace_path,
                "explanation": trace["result"].get("explanation", "")
            })

        reliability = round(passed / total, 4) if total > 0 else 0.0
        ci_status = "passed" if reliability >= self.threshold else "failed"

        report = {
            "schema_version": "1.0",
            "reliability": reliability,
            "threshold": self.threshold,
            "passed": passed,
            "failed": failed,
            "timed_out": timed_out,
            "error": error,
            "total": total,
            "status": ci_status,
            "seed": self.seed,
            "agent_version": self.agent_version,
            "scenarios": scenario_summaries
        }

        self._save_report(report)
        return report

    def _save_report(self, report: Dict[str, Any]) -> None:
        os.makedirs(os.path.dirname(self.out_path) or ".", exist_ok=True)
        with open(self.out_path, "w", encoding="utf-8") as f:
            json.dump(report, f, indent=2)

def main():
    parser = argparse.ArgumentParser(description="AgentGuard Quick Run CI Threshold Evaluator")
    parser.add_argument("--scenarios", default="scenarios/", help="Path to scenario directory or file")
    parser.add_argument("--out", default="metrics/quick_report.json", help="Path for quick report JSON output")
    parser.add_argument("--limit", type=int, help="Optional limit N of first scenarios to execute")
    parser.add_argument("--threshold", type=float, default=0.70, help="Required minimum pass-rate threshold (0.0 to 1.0)")
    parser.add_argument("--seed", type=int, default=42, help="Global seed for execution")
    parser.add_argument("--agent-version", default="v1.0.0", help="Agent version tag")

    args = parser.parse_args()

    quick_runner = QuickRunner(
        scenarios_path=args.scenarios,
        out_path=args.out,
        limit=args.limit,
        threshold=args.threshold,
        seed=args.seed,
        agent_version=args.agent_version
    )

    report = quick_runner.run()

    reliability = report["reliability"]
    threshold = report["threshold"]
    ci_status = report["status"]

    print("\nAI Agent Quick Run Evaluation")
    print("-----------------------------")
    print(f"Total Scenarios: {report['total']}")
    print(f"Passed:          {report['passed']}")
    print(f"Failed:          {report['failed']}")
    print(f"Timeouts:        {report['timed_out']}")
    print(f"Reliability:     {reliability * 100:.1f}%")
    print(f"Threshold:       {threshold * 100:.1f}%")
    print(f"CI STATUS:       {ci_status.upper()}")
    print(f"Report File:     {args.out}")

    if ci_status == "passed":
        sys.exit(0)
    else:
        sys.exit(1)

if __name__ == "__main__":
    main()

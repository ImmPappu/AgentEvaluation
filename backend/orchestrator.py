import os
import sys
import json
import argparse
import time
from typing import Dict, Any, List, Optional

# Ensure repository root is in sys.path for module resolution
repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if repo_root not in sys.path:
    sys.path.insert(0, repo_root)

from sandbox.runner import ScenarioRunner, validate_scenario_schema

class BatchOrchestrator:
    """Batch scenario suite execution engine for AgentGuard evaluation suites."""

    def __init__(
        self,
        scenarios_path: str,
        output_dir: str = "traces",
        seed: int = 42,
        agent_version: str = "v1.0.0",
        run_id_prefix: Optional[str] = None,
        workers: int = 1
    ):
        self.scenarios_path = scenarios_path
        self.output_dir = output_dir
        self.seed = seed
        self.agent_version = agent_version
        self.run_id_prefix = run_id_prefix or "batch_run"
        self.workers = workers

    def discover_scenarios(self) -> List[str]:
        """Discovers and deterministically sorts scenario JSON files."""
        if not os.path.exists(self.scenarios_path):
            return []

        if os.path.isfile(self.scenarios_path):
            return [self.scenarios_path]

        discovered = []
        for entry in os.listdir(self.scenarios_path):
            if entry.endswith(".json") and not entry.startswith("."):
                discovered.append(os.path.join(self.scenarios_path, entry))

        # Deterministic sorting by filename
        discovered.sort(key=lambda p: os.path.basename(p))
        return discovered

    def run_suite(self) -> Dict[str, Any]:
        """Executes discovered scenarios sequentially and aggregates trace metadata."""
        start_time = time.time()
        scenario_files = self.discover_scenarios()

        os.makedirs(self.output_dir, exist_ok=True)

        total = 0
        passed = 0
        failed = 0
        timed_out = 0
        errors = 0
        results_summary: List[Dict[str, Any]] = []

        for idx, filepath in enumerate(scenario_files, start=1):
            try:
                with open(filepath, "r", encoding="utf-8") as f:
                    scenario_data = json.load(f)
            except Exception as exc:
                results_summary.append({
                    "file": filepath,
                    "status": "error",
                    "explanation": f"Failed to parse JSON: {str(exc)}"
                })
                errors += 1
                total += 1
                continue

            schema_err = validate_scenario_schema(scenario_data)
            if schema_err:
                results_summary.append({
                    "file": filepath,
                    "scenario_id": scenario_data.get("id", "UNKNOWN"),
                    "status": "error",
                    "explanation": f"Invalid scenario schema: {schema_err}"
                })
                errors += 1
                total += 1
                continue

            scenario_id = scenario_data.get("id", f"SCN_{idx:03d}")
            run_id = f"{self.run_id_prefix}_{scenario_id}_{self.seed}"
            out_trace_path = os.path.join(self.output_dir, f"{scenario_id}_trace.json")

            runner = ScenarioRunner(
                scenario_data=scenario_data,
                run_id=run_id,
                seed=self.seed,
                agent_version=self.agent_version
            )

            trace = runner.run()

            # Save individual trace JSON file
            with open(out_trace_path, "w", encoding="utf-8") as f:
                json.dump(trace, f, indent=2)

            status = trace["result"]["status"]
            total += 1
            if status == "passed":
                passed += 1
            elif status == "failed":
                failed += 1
            elif status == "timeout":
                timed_out += 1
            else:
                errors += 1

            results_summary.append({
                "scenario_id": scenario_id,
                "run_id": run_id,
                "status": status,
                "trace": out_trace_path,
                "event_count": len(trace["events"]),
                "duration_ms": trace["result"].get("duration_ms", 0),
                "explanation": trace["result"].get("explanation", "")
            })

        duration_seconds = round(time.time() - start_time, 3)
        success_rate = round(passed / total, 4) if total > 0 else 0.0

        suite_summary = {
            "schema_version": "1.0",
            "seed": self.seed,
            "agent_version": self.agent_version,
            "total_scenarios": total,
            "passed": passed,
            "failed": failed,
            "timed_out": timed_out,
            "error": errors,
            "success_rate": success_rate,
            "duration_seconds": duration_seconds,
            "scenarios": results_summary
        }

        # Write aggregate summary JSON
        summary_path = os.path.join(self.output_dir, "summary.json")
        with open(summary_path, "w", encoding="utf-8") as f:
            json.dump(suite_summary, f, indent=2)

        return suite_summary

def replay_trace(trace_path: str, output_dir: str = "traces/replay") -> Dict[str, Any]:
    """Re-executes scenario from trace metadata and performs semantic execution comparison."""
    if not os.path.exists(trace_path):
        raise FileNotFoundError(f"Trace file not found: {trace_path}")

    with open(trace_path, "r", encoding="utf-8") as f:
        original_trace = json.load(f)

    scenario_id = original_trace["scenario_id"]
    seed = original_trace["seed"]
    agent_version = original_trace["agent_version"]

    # Locate matching scenario JSON in scenarios/
    scenarios_dir = "scenarios"
    target_scenario_file = None
    if os.path.exists(scenarios_dir):
        for entry in os.listdir(scenarios_dir):
            if entry.endswith(".json"):
                full_p = os.path.join(scenarios_dir, entry)
                try:
                    with open(full_p, "r", encoding="utf-8") as sf:
                        sdata = json.load(sf)
                        if sdata.get("id") == scenario_id:
                            target_scenario_file = full_p
                            break
                except Exception:
                    continue

    if not target_scenario_file:
        return {
            "replay_status": "ERROR",
            "explanation": f"Source scenario JSON file for ID '{scenario_id}' could not be located."
        }

    with open(target_scenario_file, "r", encoding="utf-8") as sf:
        scenario_data = json.load(sf)

    replay_run_id = f"replay_{original_trace['run_id']}"
    runner = ScenarioRunner(
        scenario_data=scenario_data,
        run_id=replay_run_id,
        seed=seed,
        agent_version=agent_version
    )
    new_trace = runner.run()

    # Compare semantic tool sequences and results
    orig_tools = [
        (e["type"], e.get("tool_call", {}).get("tool_name"), e.get("tool_response", {}).get("status"))
        for e in original_trace.get("events", []) if e["type"] in ["tool_call", "tool_response"]
    ]
    new_tools = [
        (e["type"], e.get("tool_call", {}).get("tool_name"), e.get("tool_response", {}).get("status"))
        for e in new_trace.get("events", []) if e["type"] in ["tool_call", "tool_response"]
    ]

    is_match = (orig_tools == new_tools) and (original_trace["result"]["status"] == new_trace["result"]["status"])

    return {
        "replay_status": "MATCH" if is_match else "MISMATCH",
        "scenario_id": scenario_id,
        "original_run_id": original_trace["run_id"],
        "replay_run_id": replay_run_id,
        "original_status": original_trace["result"]["status"],
        "replay_status_result": new_trace["result"]["status"],
        "semantic_tools_matched": is_match
    }

def main():
    parser = argparse.ArgumentParser(description="AgentGuard Batch Scenario Orchestrator")
    parser.add_argument("--scenarios", default="scenarios/", help="Path to scenarios directory or file")
    parser.add_argument("--out", default="traces/", help="Output directory for generated trace JSON files")
    parser.add_argument("--seed", type=int, default=42, help="Global seed for deterministic execution")
    parser.add_argument("--agent-version", default="v1.0.0", help="Agent version identifier")
    parser.add_argument("--run-id-prefix", default="batch", help="Prefix for run IDs")
    parser.add_argument("--workers", type=int, default=1, help="Number of worker threads (default 1 sequential)")
    parser.add_argument("--replay", help="Path to single trace file to replay and compare")

    args = parser.parse_args()

    if args.replay:
        print(f"--> Executing Deterministic Replay on trace: {args.replay}")
        try:
            replay_res = replay_trace(args.replay)
            print(json.dumps(replay_res, indent=2))
            if replay_res["replay_status"] == "MATCH":
                sys.exit(0)
            else:
                sys.exit(1)
        except Exception as exc:
            print(f"Error during replay: {exc}", file=sys.stderr)
            sys.exit(2)

    orchestrator = BatchOrchestrator(
        scenarios_path=args.scenarios,
        output_dir=args.out,
        seed=args.seed,
        agent_version=args.agent_version,
        run_id_prefix=args.run_id_prefix,
        workers=args.workers
    )

    summary = orchestrator.run_suite()

    print("\nAI Agent Evaluation Summary")
    print("----------------------------")
    print(f"Scenarios Executed: {summary['total_scenarios']}")
    print(f"Passed:             {summary['passed']}")
    print(f"Failed:             {summary['failed']}")
    print(f"Timeouts:           {summary['timed_out']}")
    print(f"Errors:             {summary['error']}")
    print(f"Success Rate:       {summary['success_rate'] * 100:.1f}%")
    print(f"Traces Saved To:    {args.out}")

    if summary["total_scenarios"] > 0 and summary["failed"] == 0 and summary["timed_out"] == 0 and summary["error"] == 0:
        sys.exit(0)
    else:
        sys.exit(1)

if __name__ == "__main__":
    main()

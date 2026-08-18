import os
import sys
import json
from backend.orchestrator import BatchOrchestrator
from backend.quick_run import QuickRunner
from scratch.validate_schemas import validate_trace

def run_smoke_test():
    print("=== AgentGuard Batch Orchestrator & Quick Run Integration Smoke Test ===")

    # 1. Execute Batch Orchestrator on scenarios/
    out_traces_dir = "traces/smoke_batch"
    print(f"\n1. Executing BatchOrchestrator on 'scenarios/' -> '{out_traces_dir}'...")
    orchestrator = BatchOrchestrator(
        scenarios_path="scenarios/",
        output_dir=out_traces_dir,
        seed=42,
        agent_version="v1.0.0"
    )
    summary = orchestrator.run_suite()

    print("   Total Executed:", summary["total_scenarios"])
    print("   Passed:        ", summary["passed"])
    print("   Failed:        ", summary["failed"])
    print("   Success Rate:  ", f"{summary['success_rate']*100:.1f}%")
    assert summary["total_scenarios"] > 0
    assert os.path.exists(os.path.join(out_traces_dir, "summary.json"))

    # 2. Validate at least one generated trace JSON schema
    sample_trace_path = summary["scenarios"][0]["trace"]
    print(f"\n2. Validating schema of generated trace: {sample_trace_path}...")
    with open(sample_trace_path, "r", encoding="utf-8") as tf:
        tdata = json.load(tf)
    errs = validate_trace(tdata)
    assert len(errs) == 0, f"Trace validation errors: {errs}"
    print("   SUCCESS: Generated trace is 100% compliant with trace_schema.md!")

    # 3. Execute QuickRunner with limit=5 and threshold=0.50 (passing threshold)
    print("\n3. Executing QuickRunner with passing threshold (0.50)...")
    qrunner_pass = QuickRunner(
        scenarios_path="scenarios/",
        out_path="metrics/smoke_quick_pass.json",
        limit=5,
        threshold=0.50
    )
    qreport_pass = qrunner_pass.run()

    print("   Total Scenarios:", qreport_pass["total"])
    print("   Reliability:    ", f"{qreport_pass['reliability']*100:.1f}%")
    print("   Threshold:      ", f"{qreport_pass['threshold']*100:.1f}%")
    print("   CI Status:      ", qreport_pass["status"].upper())
    assert qreport_pass["status"] == "passed"
    assert os.path.exists("metrics/smoke_quick_pass.json")

    # 4. Execute QuickRunner with threshold=0.99 (failing threshold)
    print("\n4. Executing QuickRunner with failing threshold (0.99)...")
    qrunner_fail = QuickRunner(
        scenarios_path="scenarios/",
        out_path="metrics/smoke_quick_fail.json",
        limit=5,
        threshold=0.99
    )
    qreport_fail = qrunner_fail.run()

    print("   Total Scenarios:", qreport_fail["total"])
    print("   Reliability:    ", f"{qreport_fail['reliability']*100:.1f}%")
    print("   Threshold:      ", f"{qreport_fail['threshold']*100:.1f}%")
    print("   CI Status:      ", qreport_fail["status"].upper())
    assert qreport_fail["status"] == "failed"
    assert os.path.exists("metrics/smoke_quick_fail.json")

    print("\n=== SMOKE TEST PASSED: Batch orchestration and Quick CI Runner verified! ===")

if __name__ == "__main__":
    run_smoke_test()

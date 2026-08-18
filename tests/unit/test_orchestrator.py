import os
import json
import tempfile
import pytest

from backend.orchestrator import BatchOrchestrator, replay_trace

@pytest.fixture
def temp_scenarios_dir():
    with tempfile.TemporaryDirectory() as tmpdir:
        # Create 3 scenario files
        s1 = {
            "schema_version": "1.0",
            "id": "SCN-TEST-001",
            "prompt": "Get order ORD-1001",
            "expected_tools": ["get_order"],
            "risk_tags": ["normal"]
        }
        s2 = {
            "schema_version": "1.0",
            "id": "SCN-TEST-002",
            "prompt": "Cancel order ORD-1002",
            "expected_tools": ["cancel_order"],
            "risk_tags": ["normal"]
        }
        s3 = {
            "schema_version": "1.0",
            "id": "SCN-TEST-003",
            "prompt": "Get order with failure",
            "expected_tools": ["get_order"],
            "risk_tags": ["tool_failure"],
            "mock_tool_behaviors": {"get_order": {"forced_status": "SERVER_ERROR"}}
        }
        with open(os.path.join(tmpdir, "02_cancel.json"), "w") as f:
            json.dump(s2, f)
        with open(os.path.join(tmpdir, "01_get.json"), "w") as f:
            json.dump(s1, f)
        with open(os.path.join(tmpdir, "03_fail.json"), "w") as f:
            json.dump(s3, f)
        yield tmpdir

def test_A_scenario_directory_discovery(temp_scenarios_dir):
    orch = BatchOrchestrator(scenarios_path=temp_scenarios_dir)
    files = orch.discover_scenarios()
    assert len(files) == 3

def test_B_deterministic_ordering(temp_scenarios_dir):
    orch = BatchOrchestrator(scenarios_path=temp_scenarios_dir)
    files = orch.discover_scenarios()
    basenames = [os.path.basename(f) for f in files]
    assert basenames == ["01_get.json", "02_cancel.json", "03_fail.json"]

def test_C_single_scenario_execution(temp_scenarios_dir):
    single_file = os.path.join(temp_scenarios_dir, "01_get.json")
    with tempfile.TemporaryDirectory() as outdir:
        orch = BatchOrchestrator(scenarios_path=single_file, output_dir=outdir)
        summary = orch.run_suite()
        assert summary["total_scenarios"] == 1
        assert summary["passed"] == 1

def test_D_multiple_scenario_execution(temp_scenarios_dir):
    with tempfile.TemporaryDirectory() as outdir:
        orch = BatchOrchestrator(scenarios_path=temp_scenarios_dir, output_dir=outdir)
        summary = orch.run_suite()
        assert summary["total_scenarios"] == 3
        assert summary["passed"] == 2
        assert summary["failed"] == 1

def test_E_trace_collection(temp_scenarios_dir):
    with tempfile.TemporaryDirectory() as outdir:
        orch = BatchOrchestrator(scenarios_path=temp_scenarios_dir, output_dir=outdir)
        summary = orch.run_suite()
        assert os.path.exists(os.path.join(outdir, "SCN-TEST-001_trace.json"))
        assert os.path.exists(os.path.join(outdir, "SCN-TEST-002_trace.json"))
        assert os.path.exists(os.path.join(outdir, "SCN-TEST-003_trace.json"))

def test_F_failed_scenario_does_not_stop_suite(temp_scenarios_dir):
    with tempfile.TemporaryDirectory() as outdir:
        orch = BatchOrchestrator(scenarios_path=temp_scenarios_dir, output_dir=outdir)
        summary = orch.run_suite()
        # Even though scenario 3 failed, suite executed all 3
        assert len(summary["scenarios"]) == 3

def test_G_seed_propagation(temp_scenarios_dir):
    with tempfile.TemporaryDirectory() as outdir:
        orch = BatchOrchestrator(scenarios_path=temp_scenarios_dir, output_dir=outdir, seed=999)
        summary = orch.run_suite()
        assert summary["seed"] == 999

def test_H_agent_version_propagation(temp_scenarios_dir):
    with tempfile.TemporaryDirectory() as outdir:
        orch = BatchOrchestrator(scenarios_path=temp_scenarios_dir, output_dir=outdir, agent_version="v2.5.0")
        summary = orch.run_suite()
        assert summary["agent_version"] == "v2.5.0"

def test_I_output_directory_creation(temp_scenarios_dir):
    with tempfile.TemporaryDirectory() as parent_dir:
        outdir = os.path.join(parent_dir, "nested", "traces")
        orch = BatchOrchestrator(scenarios_path=temp_scenarios_dir, output_dir=outdir)
        orch.run_suite()
        assert os.path.exists(outdir)

def test_J_aggregate_summary(temp_scenarios_dir):
    with tempfile.TemporaryDirectory() as outdir:
        orch = BatchOrchestrator(scenarios_path=temp_scenarios_dir, output_dir=outdir)
        summary = orch.run_suite()
        summary_file = os.path.join(outdir, "summary.json")
        assert os.path.exists(summary_file)
        with open(summary_file, "r") as f:
            data = json.load(f)
        assert data["total_scenarios"] == 3

def test_K_deterministic_repeated_execution(temp_scenarios_dir):
    with tempfile.TemporaryDirectory() as outdir1, tempfile.TemporaryDirectory() as outdir2:
        orch1 = BatchOrchestrator(scenarios_path=temp_scenarios_dir, output_dir=outdir1, seed=42)
        s1 = orch1.run_suite()

        orch2 = BatchOrchestrator(scenarios_path=temp_scenarios_dir, output_dir=outdir2, seed=42)
        s2 = orch2.run_suite()

        assert s1["total_scenarios"] == s2["total_scenarios"]
        assert s1["passed"] == s2["passed"]
        assert s1["failed"] == s2["failed"]
        assert s1["success_rate"] == s2["success_rate"]

def test_L_malformed_scenario_handling(temp_scenarios_dir):
    with open(os.path.join(temp_scenarios_dir, "00_bad.json"), "w") as f:
        f.write("{invalid_json_here")
    with tempfile.TemporaryDirectory() as outdir:
        orch = BatchOrchestrator(scenarios_path=temp_scenarios_dir, output_dir=outdir)
        summary = orch.run_suite()
        assert summary["error"] >= 1

def test_M_empty_scenario_directory():
    with tempfile.TemporaryDirectory() as empty_dir, tempfile.TemporaryDirectory() as outdir:
        orch = BatchOrchestrator(scenarios_path=empty_dir, output_dir=outdir)
        summary = orch.run_suite()
        assert summary["total_scenarios"] == 0
        assert summary["success_rate"] == 0.0

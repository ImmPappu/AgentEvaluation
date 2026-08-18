import os
import json
import tempfile
import pytest

from backend.quick_run import QuickRunner

@pytest.fixture
def temp_scenarios():
    with tempfile.TemporaryDirectory() as tmpdir:
        s1 = {
            "schema_version": "1.0",
            "id": "SCN-Q-001",
            "prompt": "Get order ORD-1001",
            "expected_tools": ["get_order"],
            "risk_tags": ["normal"]
        }
        s2 = {
            "schema_version": "1.0",
            "id": "SCN-Q-002",
            "prompt": "Cancel order ORD-1002",
            "expected_tools": ["cancel_order"],
            "risk_tags": ["normal"]
        }
        s3 = {
            "schema_version": "1.0",
            "id": "SCN-Q-003",
            "prompt": "Fail scenario",
            "expected_tools": ["get_order"],
            "risk_tags": ["tool_failure"],
            "mock_tool_behaviors": {"get_order": {"forced_status": "SERVER_ERROR"}}
        }
        with open(os.path.join(tmpdir, "01_get.json"), "w") as f:
            json.dump(s1, f)
        with open(os.path.join(tmpdir, "02_cancel.json"), "w") as f:
            json.dump(s2, f)
        with open(os.path.join(tmpdir, "03_fail.json"), "w") as f:
            json.dump(s3, f)
        yield tmpdir

def test_N_report_generation(temp_scenarios):
    with tempfile.TemporaryDirectory() as outdir:
        out_file = os.path.join(outdir, "report.json")
        runner = QuickRunner(scenarios_path=temp_scenarios, out_path=out_file)
        report = runner.run()
        assert os.path.exists(out_file)
        assert report["total"] == 3

def test_O_reliability_calculation(temp_scenarios):
    runner = QuickRunner(scenarios_path=temp_scenarios)
    report = runner.run()
    # 2 passed out of 3 = 0.6667
    assert report["passed"] == 2
    assert report["total"] == 3
    assert report["reliability"] == 0.6667

def test_P_threshold_pass(temp_scenarios):
    runner = QuickRunner(scenarios_path=temp_scenarios, threshold=0.50)
    report = runner.run()
    assert report["status"] == "passed"

def test_Q_threshold_fail(temp_scenarios):
    runner = QuickRunner(scenarios_path=temp_scenarios, threshold=0.90)
    report = runner.run()
    assert report["status"] == "failed"

def test_R_exit_code_0_when_threshold_passes(temp_scenarios):
    runner = QuickRunner(scenarios_path=temp_scenarios, threshold=0.50)
    report = runner.run()
    status_pass = (report["status"] == "passed")
    assert status_pass is True

def test_S_exit_code_1_when_threshold_fails(temp_scenarios):
    runner = QuickRunner(scenarios_path=temp_scenarios, threshold=0.99)
    report = runner.run()
    status_fail = (report["status"] == "failed")
    assert status_fail is True

def test_T_deterministic_scenario_selection_with_limit(temp_scenarios):
    runner1 = QuickRunner(scenarios_path=temp_scenarios, limit=2)
    rep1 = runner1.run()

    runner2 = QuickRunner(scenarios_path=temp_scenarios, limit=2)
    rep2 = runner2.run()

    assert rep1["total"] == 2
    assert rep2["total"] == 2
    ids1 = [s["scenario_id"] for s in rep1["scenarios"]]
    ids2 = [s["scenario_id"] for s in rep2["scenarios"]]
    assert ids1 == ids2 == ["SCN-Q-001", "SCN-Q-002"]

def test_U_output_directory_creation(temp_scenarios):
    with tempfile.TemporaryDirectory() as tmpdir:
        nested_out = os.path.join(tmpdir, "nested_metrics", "quick_report.json")
        runner = QuickRunner(scenarios_path=temp_scenarios, out_path=nested_out)
        runner.run()
        assert os.path.exists(nested_out)

def test_V_malformed_input_handling(temp_scenarios):
    with open(os.path.join(temp_scenarios, "00_bad.json"), "w") as f:
        f.write("{invalid_json_")
    runner = QuickRunner(scenarios_path=temp_scenarios)
    report = runner.run()
    assert report["error"] >= 1

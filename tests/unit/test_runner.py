import os
import json
import tempfile
import pytest

from sandbox.runner import ScenarioRunner, validate_scenario_schema
from scratch.validate_schemas import validate_trace

@pytest.fixture
def sample_scenario():
    return {
        "schema_version": "1.0",
        "id": "SCN-TEST-001",
        "category": "normal",
        "prompt": "Check order status for ORD-1001",
        "expected_tools": ["get_order"],
        "risk_tags": ["normal"],
        "target_order_id": "ORD-1001"
    }

def test_A_scenario_loading(sample_scenario):
    err = validate_scenario_schema(sample_scenario)
    assert err is None

def test_B_successful_execution(sample_scenario):
    runner = ScenarioRunner(scenario_data=sample_scenario, seed=42)
    trace = runner.run()
    assert trace["result"]["status"] == "passed"
    assert len(trace["events"]) > 0

def test_C_trace_creation(sample_scenario):
    runner = ScenarioRunner(scenario_data=sample_scenario, seed=42)
    trace = runner.run()
    assert "schema_version" in trace
    assert "run_id" in trace
    assert "events" in trace
    assert "result" in trace

def test_D_trace_schema_compatibility(sample_scenario):
    runner = ScenarioRunner(scenario_data=sample_scenario, seed=42)
    trace = runner.run()
    errors = validate_trace(trace)
    assert len(errors) == 0, f"Trace schema validation errors: {errors}"

def test_E_tool_call_event(sample_scenario):
    runner = ScenarioRunner(scenario_data=sample_scenario, seed=42)
    trace = runner.run()
    tool_calls = [e for e in trace["events"] if e["type"] == "tool_call"]
    assert len(tool_calls) == 1
    assert tool_calls[0]["tool_call"]["tool_name"] == "get_order"

def test_F_tool_response_event(sample_scenario):
    runner = ScenarioRunner(scenario_data=sample_scenario, seed=42)
    trace = runner.run()
    tool_responses = [e for e in trace["events"] if e["type"] == "tool_response"]
    assert len(tool_responses) == 1
    assert tool_responses[0]["tool_response"]["status"] == "SUCCESS"
    assert tool_responses[0]["tool_response"]["output"]["success"] is True

def test_G_tool_failure(sample_scenario):
    sample_scenario["mock_tool_behaviors"] = {
        "get_order": {"forced_status": "SERVER_ERROR"}
    }
    runner = ScenarioRunner(scenario_data=sample_scenario, seed=42)
    trace = runner.run()
    assert trace["result"]["status"] == "failed"
    tool_responses = [e for e in trace["events"] if e["type"] == "tool_response"]
    assert tool_responses[0]["tool_response"]["status"] == "SERVER_ERROR"

def test_H_timeout(sample_scenario):
    sample_scenario["mock_tool_behaviors"] = {
        "get_order": {"forced_status": "TIMEOUT"}
    }
    runner = ScenarioRunner(scenario_data=sample_scenario, seed=42)
    trace = runner.run()
    assert trace["result"]["status"] == "timeout"

def test_I_malformed_scenario():
    malformed = {"id": "SCN-BAD", "prompt": "Missing expected tools"}
    err = validate_scenario_schema(malformed)
    assert err is not None
    assert "Missing required scenario field" in err

def test_J_unknown_tool(sample_scenario):
    sample_scenario["expected_tools"] = ["non_existent_tool_xyz"]
    runner = ScenarioRunner(scenario_data=sample_scenario, seed=42)
    trace = runner.run()
    assert trace["result"]["status"] == "failed"

def test_K_deterministic_execution(sample_scenario):
    runner1 = ScenarioRunner(scenario_data=sample_scenario, seed=42, run_id="run_det_100")
    trace1 = runner1.run()

    runner2 = ScenarioRunner(scenario_data=sample_scenario, seed=42, run_id="run_det_100")
    trace2 = runner2.run()

    assert trace1["run_id"] == trace2["run_id"]
    assert len(trace1["events"]) == len(trace2["events"])
    assert trace1["result"]["status"] == trace2["result"]["status"]

def test_L_output_file_creation(sample_scenario):
    with tempfile.TemporaryDirectory() as tmpdir:
        out_file = os.path.join(tmpdir, "test_trace.json")
        runner = ScenarioRunner(scenario_data=sample_scenario, seed=42)
        trace = runner.run()
        with open(out_file, "w") as f:
            json.dump(trace, f)
        assert os.path.exists(out_file)
        assert os.path.getsize(out_file) > 0

def test_M_explicit_run_id(sample_scenario):
    explicit_id = "custom_run_id_9999"
    runner = ScenarioRunner(scenario_data=sample_scenario, run_id=explicit_id)
    trace = runner.run()
    assert trace["run_id"] == explicit_id

def test_N_seed_handling(sample_scenario):
    runner = ScenarioRunner(scenario_data=sample_scenario, seed=12345)
    trace = runner.run()
    assert trace["seed"] == 12345

def test_O_agent_error_handling(sample_scenario):
    sample_scenario["metadata"] = {"force_agent_error": True}
    runner = ScenarioRunner(scenario_data=sample_scenario, seed=42)
    trace = runner.run()
    assert trace["result"]["status"] == "error"
    error_events = [e for e in trace["events"] if e["type"] == "agent_error"]
    assert len(error_events) > 0

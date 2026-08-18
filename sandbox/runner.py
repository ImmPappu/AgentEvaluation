import os
import sys
import json
import uuid
import argparse
import time
from typing import Dict, Any, List, Optional

from sandbox.mock_tools.base import FailureMode
from sandbox.mock_tools.database import db
from sandbox.mock_tools.registry import default_registry, ToolRegistry
from sandbox.agent_adapter import ReferenceAgentAdapter, BaseAgentAdapter

class ScenarioRunner:
    """Orchestrates single-scenario sandboxed execution and trace capture."""

    def __init__(
        self,
        scenario_data: Dict[str, Any],
        agent_adapter: Optional[BaseAgentAdapter] = None,
        tool_registry: Optional[ToolRegistry] = None,
        run_id: Optional[str] = None,
        seed: int = 42,
        agent_version: str = "v1.0.0",
        timeout_seconds: int = 30
    ):
        self.scenario = scenario_data
        self.agent = agent_adapter or ReferenceAgentAdapter(version=agent_version)
        self.registry = tool_registry or default_registry
        self.seed = seed
        self.agent_version = agent_version
        self.timeout_seconds = timeout_seconds
        self.run_id = run_id or str(uuid.uuid5(uuid.NAMESPACE_DNS, f"{scenario_data.get('id', 'scenario')}_{seed}"))
        
        self.events: List[Dict[str, Any]] = []
        self.event_counter = 0

    def _add_event(
        self,
        event_type: str,
        content: Optional[str] = None,
        tool_call: Optional[Dict[str, Any]] = None,
        tool_response: Optional[Dict[str, Any]] = None,
        error: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        self.event_counter += 1
        event = {
            "event_id": f"evt_{self.event_counter:03d}",
            "ts": "2026-08-19T00:00:00.000Z",  # Constant ISO format for deterministic serialization
            "type": event_type,
        }
        if content is not None:
            event["content"] = content
        if tool_call is not None:
            event["tool_call"] = tool_call
        if tool_response is not None:
            event["tool_response"] = tool_response
        if error is not None:
            event["error"] = error
            
        self.events.append(event)
        return event

    def run(self) -> Dict[str, Any]:
        """Executes the scenario and returns the trace dictionary."""
        start_time = time.time()
        db.reset()

        scenario_id = self.scenario.get("id", "UNKNOWN_SCENARIO")
        max_steps = self.scenario.get("max_steps", 10)
        mock_behaviors = self.scenario.get("mock_tool_behaviors", {})

        # Emit run_started
        self._add_event(
            "run_started",
            content=f"Sandbox execution initialized for scenario {scenario_id}"
        )

        # Emit agent prompt message
        prompt = self.scenario.get("prompt", "")
        self._add_event("agent_message", content=f"User prompt: {prompt}")

        status = "passed"
        explanation = "Agent completed scenario without errors."
        labels: List[str] = []

        step_count = 0
        timed_out = False

        while step_count < max_steps:
            step_count += 1
            
            # Check timeout threshold
            elapsed = time.time() - start_time
            if elapsed > self.timeout_seconds:
                timed_out = True
                status = "timeout"
                explanation = f"Execution exceeded timeout limit of {self.timeout_seconds} seconds."
                self._add_event("agent_error", content=explanation)
                break

            try:
                action_type, payload = self.agent.run_step(
                    scenario=self.scenario,
                    step_number=step_count,
                    history=self.events,
                    tool_registry=self.registry
                )
            except Exception as exc:
                status = "error"
                explanation = f"Agent execution exception: {str(exc)}"
                self._add_event("agent_error", error={
                    "code": "AGENT_ERROR",
                    "message": str(exc),
                    "severity": "HIGH"
                })
                break

            if action_type == "message":
                self._add_event("agent_message", content=payload.get("content", ""))
                break  # Agent produced final message

            elif action_type == "tool_call":
                tool_name = payload.get("tool_name", "")
                args = payload.get("args", {})
                call_id = f"call_{step_count:03d}"

                self._add_event(
                    "tool_call",
                    tool_call={
                        "call_id": call_id,
                        "tool_name": tool_name,
                        "args": args
                    }
                )

                # Determine failure mode injection if defined in scenario
                failure_mode_str = mock_behaviors.get(tool_name, {}).get("forced_status", "SUCCESS")
                try:
                    failure_mode = FailureMode(failure_mode_str)
                except ValueError:
                    failure_mode = FailureMode.SUCCESS

                tool_res = self.registry.execute(tool_name, args, failure_mode=failure_mode)

                self._add_event(
                    "tool_response",
                    tool_response={
                        "call_id": call_id,
                        "tool_name": tool_name,
                        "status": tool_res.status.value,
                        "output": tool_res.output,
                        "latency_ms": tool_res.latency_ms,
                        "error": tool_res.error
                    }
                )

                if not tool_res.success:
                    if tool_res.status == FailureMode.TIMEOUT:
                        status = "timeout"
                        explanation = f"Tool '{tool_name}' execution timed out."
                    else:
                        status = "failed"
                        explanation = f"Tool '{tool_name}' failed: {tool_res.error.get('message') if tool_res.error else 'Error'}"

        duration_ms = int((time.time() - start_time) * 1000)

        # Emit run_finished
        self._add_event(
            "run_finished",
            content=f"Run finished with status '{status}'."
        )

        trace = {
            "schema_version": "1.0",
            "run_id": self.run_id,
            "scenario_id": scenario_id,
            "agent_version": self.agent_version,
            "seed": self.seed,
            "events": self.events,
            "result": {
                "status": status,
                "labels": labels,
                "explanation": explanation,
                "duration_ms": duration_ms
            },
            "metadata": {
                "environment": "sandbox",
                "max_steps": max_steps,
                "step_count": step_count
            }
        }
        return trace

def validate_scenario_schema(scenario: Dict[str, Any]) -> Optional[str]:
    required = ["id", "prompt", "expected_tools", "risk_tags"]
    for field in required:
        if field not in scenario:
            return f"Missing required scenario field: '{field}'"
    return None

def main():
    parser = argparse.ArgumentParser(description="AgentGuard Single Scenario Sandbox Execution Runner")
    parser.add_argument("--scenario", required=True, help="Path to scenario JSON file")
    parser.add_argument("--out", help="Output path for trace JSON file")
    parser.add_argument("--run-id", help="Explicit run ID")
    parser.add_argument("--seed", type=int, default=42, help="Random seed for deterministic execution")
    parser.add_argument("--agent-version", default="v1.0.0", help="Agent version identifier")
    parser.add_argument("--timeout", type=int, default=30, help="Execution timeout in seconds")
    parser.add_argument("--verbose", action="store_true", help="Enable verbose logging")

    args = parser.parse_args()

    if not os.path.exists(args.scenario):
        print(f"Error: Scenario file '{args.scenario}' not found.", file=sys.stderr)
        sys.exit(2)

    try:
        with open(args.scenario, "r", encoding="utf-8") as f:
            scenario_data = json.load(f)
    except Exception as exc:
        print(f"Error: Failed to parse scenario JSON file: {exc}", file=sys.stderr)
        sys.exit(2)

    schema_err = validate_scenario_schema(scenario_data)
    if schema_err:
        print(f"Error: Invalid scenario schema: {schema_err}", file=sys.stderr)
        sys.exit(2)

    runner = ScenarioRunner(
        scenario_data=scenario_data,
        run_id=args.run_id,
        seed=args.seed,
        agent_version=args.agent_version,
        timeout_seconds=args.timeout
    )

    trace = runner.run()

    status = trace["result"]["status"]
    out_path = args.out or os.path.join("traces", f"{scenario_data['id']}_trace.json")
    
    os.makedirs(os.path.dirname(out_path) or ".", exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(trace, f, indent=2)

    print(f"Run ID: {trace['run_id']}")
    print(f"Scenario: {trace['scenario_id']}")
    print(f"Status: {status}")
    print(f"Events: {len(trace['events'])}")
    print(f"Trace: {out_path}")

    if status == "passed":
        sys.exit(0)
    elif status == "timeout":
        sys.exit(124)
    else:
        sys.exit(1)

if __name__ == "__main__":
    main()

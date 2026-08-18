from typing import Dict, Any, List, Optional, Tuple
from sandbox.mock_tools.registry import ToolRegistry, default_registry

class BaseAgentAdapter:
    """Abstract interface for agents executed by the AgentGuard runner."""

    def __init__(self, name: str = "BaseAgent", version: str = "v1.0.0"):
        self.name = name
        self.version = version

    def run_step(
        self,
        scenario: Dict[str, Any],
        step_number: int,
        history: List[Dict[str, Any]],
        tool_registry: ToolRegistry
    ) -> Tuple[str, Optional[Dict[str, Any]]]:
        """
        Executes a single step of the agent.
        Returns a tuple: (action_type, payload)
        where action_type is "message" or "tool_call".
        """
        raise NotImplementedError("Subclasses must implement run_step()")

class ReferenceAgentAdapter(BaseAgentAdapter):
    """
    Local deterministic reference agent for testing infrastructure without external LLM dependencies.
    Generates structured tool calls and responses based on scenario directives.
    """

    def __init__(self, name: str = "ReferenceAgent", version: str = "v1.0.0"):
        super().__init__(name=name, version=version)

    def run_step(
        self,
        scenario: Dict[str, Any],
        step_number: int,
        history: List[Dict[str, Any]],
        tool_registry: ToolRegistry
    ) -> Tuple[str, Optional[Dict[str, Any]]]:
        prompt = scenario.get("prompt", "")
        expected_tools = scenario.get("expected_tools", [])
        metadata = scenario.get("metadata", {})

        if metadata.get("force_agent_error") and step_number == 1:
            raise RuntimeError("Simulated agent internal reasoning exception.")

        # Check history to determine if last action was a tool call
        last_event = history[-1] if history else None

        if last_event and last_event.get("type") == "tool_response":
            tool_resp = last_event.get("tool_response", {})
            if tool_resp.get("status") == "SUCCESS":
                output = tool_resp.get("output", {})
                return "message", {
                    "content": f"Task completed successfully. Tool response output: {output}"
                }
            else:
                err = tool_resp.get("error", {})
                return "message", {
                    "content": f"Task encountered tool failure: {err.get('message', 'Unknown error')}"
                }

        # Step 1: Issue tool call based on expected_tools or scenario prompt
        if expected_tools and step_number == 1:
            target_tool = expected_tools[0]
            args = self._derive_tool_args(target_tool, prompt, scenario)
            return "tool_call", {
                "tool_name": target_tool,
                "args": args
            }

        # Default fallback message if no tool call required
        return "message", {
            "content": f"Processed scenario prompt: '{prompt}'."
        }

    def _derive_tool_args(self, tool_name: str, prompt: str, scenario: Dict[str, Any]) -> Dict[str, Any]:
        """Derives tool arguments deterministically from prompt or scenario initial state."""
        initial_state = scenario.get("initial_state", {})
        orders = initial_state.get("orders", {})
        first_order_id = list(orders.keys())[0] if orders else "ORD-1001"

        if tool_name == "get_order":
            return {"order_id": scenario.get("target_order_id", first_order_id)}
        elif tool_name == "refund_order":
            return {
                "order_id": scenario.get("target_order_id", first_order_id),
                "amount": scenario.get("refund_amount", 150.0)
            }
        elif tool_name == "cancel_order":
            return {"order_id": scenario.get("target_order_id", first_order_id)}
        elif tool_name == "send_email":
            return {
                "recipient": scenario.get("recipient", "customer@example.com"),
                "subject": scenario.get("subject", "Order Notification"),
                "body": scenario.get("body", "Your order status has been updated.")
            }
        return {}

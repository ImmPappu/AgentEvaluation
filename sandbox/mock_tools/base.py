from enum import Enum
from typing import Dict, Any, Optional
from dataclasses import dataclass, field

class FailureMode(str, Enum):
    SUCCESS = "SUCCESS"
    TIMEOUT = "TIMEOUT"
    INVALID_RESPONSE = "INVALID_RESPONSE"
    PERMISSION_DENIED = "PERMISSION_DENIED"
    SERVER_ERROR = "SERVER_ERROR"

@dataclass
class ToolResult:
    tool_name: str
    success: bool
    status: FailureMode
    output: Optional[Dict[str, Any]] = None
    error: Optional[Dict[str, Any]] = None
    latency_ms: int = 0

    def to_dict(self) -> Dict[str, Any]:
        return {
            "tool_name": self.tool_name,
            "success": self.success,
            "status": self.status.value,
            "output": self.output,
            "error": self.error,
            "latency_ms": self.latency_ms,
        }

class BaseTool:
    """Base interface for all mocked tools in AgentGuard."""
    
    name: str = "base_tool"
    description: str = "Base tool interface"
    
    def validate_args(self, args: Dict[str, Any]) -> Optional[str]:
        """Validates arguments. Returns error message if invalid, None if valid."""
        if not isinstance(args, dict):
            return "Arguments must be a dictionary."
        return None

    def execute(
        self,
        args: Dict[str, Any],
        failure_mode: FailureMode = FailureMode.SUCCESS
    ) -> ToolResult:
        """Executes the tool with optional failure injection."""
        validation_error = self.validate_args(args)
        if validation_error:
            return ToolResult(
                tool_name=self.name,
                success=False,
                status=FailureMode.SUCCESS,
                error={
                    "code": "INVALID_ARGUMENTS",
                    "message": validation_error
                }
            )

        # Handle failure injections deterministically
        if failure_mode == FailureMode.TIMEOUT:
            return ToolResult(
                tool_name=self.name,
                success=False,
                status=FailureMode.TIMEOUT,
                error={
                    "code": "TOOL_TIMEOUT",
                    "message": f"Execution of tool '{self.name}' timed out after 5000ms."
                },
                latency_ms=5000
            )
        elif failure_mode == FailureMode.INVALID_RESPONSE:
            return ToolResult(
                tool_name=self.name,
                success=True,
                status=FailureMode.INVALID_RESPONSE,
                output={
                    "corrupted_payload": True,
                    "malformed": "???<<<INVALID>>>???"
                },
                latency_ms=10
            )
        elif failure_mode == FailureMode.PERMISSION_DENIED:
            return ToolResult(
                tool_name=self.name,
                success=False,
                status=FailureMode.PERMISSION_DENIED,
                error={
                    "code": "PERMISSION_DENIED",
                    "message": f"Access denied for executing tool '{self.name}'."
                },
                latency_ms=15
            )
        elif failure_mode == FailureMode.SERVER_ERROR:
            return ToolResult(
                tool_name=self.name,
                success=False,
                status=FailureMode.SERVER_ERROR,
                error={
                    "code": "INTERNAL_SERVER_ERROR",
                    "message": f"Simulated server crash during tool '{self.name}' execution."
                },
                latency_ms=50
            )

        # FailureMode.SUCCESS -> run concrete tool logic
        try:
            return self._run(args)
        except Exception as exc:
            return ToolResult(
                tool_name=self.name,
                success=False,
                status=FailureMode.SUCCESS,
                error={
                    "code": "UNHANDLED_TOOL_ERROR",
                    "message": str(exc)
                }
            )

    def _run(self, args: Dict[str, Any]) -> ToolResult:
        """Internal execution implementation for concrete tools."""
        raise NotImplementedError("Subclasses must implement _run()")

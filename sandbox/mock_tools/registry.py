from typing import Dict, Any, List, Optional
from sandbox.mock_tools.base import BaseTool, ToolResult, FailureMode
from sandbox.mock_tools.customer_support import (
    GetOrderTool,
    RefundOrderTool,
    CancelOrderTool,
    SendEmailTool
)

class ToolRegistry:
    """Central registry for discovering and executing mocked tools."""

    def __init__(self):
        self._tools: Dict[str, BaseTool] = {}

    def register(self, tool: BaseTool) -> None:
        """Registers a tool instance."""
        self._tools[tool.name] = tool

    def get(self, tool_name: str) -> Optional[BaseTool]:
        """Retrieves a tool by name."""
        return self._tools.get(tool_name)

    def has_tool(self, tool_name: str) -> bool:
        """Checks if a tool is registered."""
        return tool_name in self._tools

    def list_tools(self) -> List[Dict[str, str]]:
        """Lists all registered tools with their descriptions."""
        return [
            {"name": tool.name, "description": tool.description}
            for tool in self._tools.values()
        ]

    def execute(
        self,
        tool_name: str,
        args: Dict[str, Any],
        failure_mode: FailureMode = FailureMode.SUCCESS
    ) -> ToolResult:
        """Executes a tool by name with optional failure mode injection."""
        tool = self.get(tool_name)
        if not tool:
            return ToolResult(
                tool_name=tool_name,
                success=False,
                status=FailureMode.SUCCESS,
                error={
                    "code": "UNKNOWN_TOOL",
                    "message": f"Tool '{tool_name}' is not registered in the tool registry."
                }
            )

        return tool.execute(args, failure_mode=failure_mode)

def create_default_registry() -> ToolRegistry:
    """Creates a ToolRegistry populated with baseline Customer Support tools."""
    registry = ToolRegistry()
    registry.register(GetOrderTool())
    registry.register(RefundOrderTool())
    registry.register(CancelOrderTool())
    registry.register(SendEmailTool())
    return registry

# Default registry singleton instance
default_registry = create_default_registry()

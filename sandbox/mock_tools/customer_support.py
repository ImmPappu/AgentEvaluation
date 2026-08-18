from typing import Dict, Any, Optional
import hashlib
from sandbox.mock_tools.base import BaseTool, ToolResult, FailureMode
from sandbox.mock_tools.database import db

class GetOrderTool(BaseTool):
    name = "get_order"
    description = "Retrieves order details by order_id."

    def validate_args(self, args: Dict[str, Any]) -> Optional[str]:
        base_err = super().validate_args(args)
        if base_err:
            return base_err
        if "order_id" not in args or not isinstance(args["order_id"], str) or not args["order_id"].strip():
            return "Missing or invalid 'order_id' parameter."
        return None

    def _run(self, args: Dict[str, Any]) -> ToolResult:
        order_id = args["order_id"].strip()
        order = db.get_order(order_id)
        if not order:
            return ToolResult(
                tool_name=self.name,
                success=False,
                status=FailureMode.SUCCESS,
                error={
                    "code": "ORDER_NOT_FOUND",
                    "message": f"Order '{order_id}' was not found in the database."
                }
            )

        return ToolResult(
            tool_name=self.name,
            success=True,
            status=FailureMode.SUCCESS,
            output={
                "success": True,
                "order": order
            }
        )

class RefundOrderTool(BaseTool):
    name = "refund_order"
    description = "Processes a full or partial refund for a specified order_id."

    def validate_args(self, args: Dict[str, Any]) -> Optional[str]:
        base_err = super().validate_args(args)
        if base_err:
            return base_err
        if "order_id" not in args or not isinstance(args["order_id"], str) or not args["order_id"].strip():
            return "Missing or invalid 'order_id' parameter."
        if "amount" in args and (not isinstance(args["amount"], (int, float)) or args["amount"] <= 0):
            return "Optional 'amount' parameter must be a positive number."
        return None

    def _run(self, args: Dict[str, Any]) -> ToolResult:
        order_id = args["order_id"].strip()
        order = db.get_order(order_id)
        if not order:
            return ToolResult(
                tool_name=self.name,
                success=False,
                status=FailureMode.SUCCESS,
                error={
                    "code": "ORDER_NOT_FOUND",
                    "message": f"Cannot refund order. Order '{order_id}' not found."
                }
            )

        if not order.get("refundable", False):
            return ToolResult(
                tool_name=self.name,
                success=False,
                status=FailureMode.SUCCESS,
                error={
                    "code": "ORDER_NOT_REFUNDABLE",
                    "message": f"Order '{order_id}' in state '{order['status']}' is not eligible for refund."
                }
            )

        refund_amount = args.get("amount", order["amount"])
        if refund_amount > order["amount"]:
            return ToolResult(
                tool_name=self.name,
                success=False,
                status=FailureMode.SUCCESS,
                error={
                    "code": "EXCESSIVE_REFUND_AMOUNT",
                    "message": f"Requested refund amount ${refund_amount} exceeds order total ${order['amount']}."
                }
            )

        # Execute simulated in-memory refund
        refund_id = f"RFD-{hashlib.md5(f'{order_id}_{refund_amount}'.encode()).hexdigest()[:8].upper()}"
        db.update_order(order_id, {"status": "refunded", "refundable": False})

        return ToolResult(
            tool_name=self.name,
            success=True,
            status=FailureMode.SUCCESS,
            output={
                "success": True,
                "order_id": order_id,
                "refund_id": refund_id,
                "amount": refund_amount,
                "currency": order.get("currency", "USD"),
                "status": "refunded"
            }
        )

class CancelOrderTool(BaseTool):
    name = "cancel_order"
    description = "Cancels an order if it is in a cancellable state (pending or processing)."

    def validate_args(self, args: Dict[str, Any]) -> Optional[str]:
        base_err = super().validate_args(args)
        if base_err:
            return base_err
        if "order_id" not in args or not isinstance(args["order_id"], str) or not args["order_id"].strip():
            return "Missing or invalid 'order_id' parameter."
        return None

    def _run(self, args: Dict[str, Any]) -> ToolResult:
        order_id = args["order_id"].strip()
        order = db.get_order(order_id)
        if not order:
            return ToolResult(
                tool_name=self.name,
                success=False,
                status=FailureMode.SUCCESS,
                error={
                    "code": "ORDER_NOT_FOUND",
                    "message": f"Cannot cancel order. Order '{order_id}' not found."
                }
            )

        current_status = order.get("status", "")
        if current_status not in ["pending", "processing"] or not order.get("cancellable", False):
            return ToolResult(
                tool_name=self.name,
                success=False,
                status=FailureMode.SUCCESS,
                error={
                    "code": "ORDER_NOT_CANCELLABLE",
                    "message": f"Order '{order_id}' in state '{current_status}' cannot be cancelled."
                }
            )

        db.update_order(order_id, {"status": "cancelled", "cancellable": False, "refundable": False})

        return ToolResult(
            tool_name=self.name,
            success=True,
            status=FailureMode.SUCCESS,
            output={
                "success": True,
                "order_id": order_id,
                "previous_status": current_status,
                "status": "cancelled"
            }
        )

class SendEmailTool(BaseTool):
    name = "send_email"
    description = "Sends a simulated email message to a recipient."

    def validate_args(self, args: Dict[str, Any]) -> Optional[str]:
        base_err = super().validate_args(args)
        if base_err:
            return base_err
        for field in ["recipient", "subject", "body"]:
            if field not in args or not isinstance(args[field], str) or not args[field].strip():
                return f"Missing or invalid '{field}' parameter."
        return None

    def _run(self, args: Dict[str, Any]) -> ToolResult:
        recipient = args["recipient"].strip()
        subject = args["subject"].strip()
        body = args["body"].strip()

        # Generate deterministic message ID
        msg_hash = hashlib.sha256(f"{recipient}:{subject}:{body}".encode()).hexdigest()[:10].upper()
        message_id = f"MSG-{msg_hash}"

        email_record = db.add_email_to_outbox(recipient, subject, body, message_id)

        return ToolResult(
            tool_name=self.name,
            success=True,
            status=FailureMode.SUCCESS,
            output={
                "success": True,
                "message_id": message_id,
                "recipient": recipient,
                "status": "queued"
            }
        )

import pytest
from sandbox.mock_tools.base import FailureMode
from sandbox.mock_tools.database import db
from sandbox.mock_tools.registry import create_default_registry, ToolRegistry

@pytest.fixture(autouse=True)
def reset_mock_database():
    """Automatically resets the mock database before each test."""
    db.reset()

def test_A_get_order_success():
    registry = create_default_registry()
    res = registry.execute("get_order", {"order_id": "ORD-1001"})
    assert res.success is True
    assert res.status == FailureMode.SUCCESS
    assert res.output["order"]["order_id"] == "ORD-1001"
    assert res.output["order"]["status"] == "pending"

def test_B_get_order_unknown():
    registry = create_default_registry()
    res = registry.execute("get_order", {"order_id": "ORD-UNKNOWN-999"})
    assert res.success is False
    assert res.error["code"] == "ORDER_NOT_FOUND"

def test_C_refund_valid_order():
    registry = create_default_registry()
    res = registry.execute("refund_order", {"order_id": "ORD-1001"})
    assert res.success is True
    assert res.output["status"] == "refunded"
    assert res.output["amount"] == 150.0
    
    # Check that database order state updated
    updated_order = db.get_order("ORD-1001")
    assert updated_order["status"] == "refunded"
    assert updated_order["refundable"] is False

def test_D_refund_non_refundable():
    registry = create_default_registry()
    res = registry.execute("refund_order", {"order_id": "ORD-1003"}) # ORD-1003 is shipped/non-refundable
    assert res.success is False
    assert res.error["code"] == "ORDER_NOT_REFUNDABLE"

def test_E_cancel_valid_order():
    registry = create_default_registry()
    res = registry.execute("cancel_order", {"order_id": "ORD-1002"}) # ORD-1002 is processing/cancellable
    assert res.success is True
    assert res.output["status"] == "cancelled"
    
    updated_order = db.get_order("ORD-1002")
    assert updated_order["status"] == "cancelled"

def test_F_cancel_invalid_state():
    registry = create_default_registry()
    res = registry.execute("cancel_order", {"order_id": "ORD-1004"}) # ORD-1004 is delivered
    assert res.success is False
    assert res.error["code"] == "ORDER_NOT_CANCELLABLE"

def test_G_send_email():
    registry = create_default_registry()
    res = registry.execute("send_email", {
        "recipient": "customer@example.com",
        "subject": "Order Update",
        "body": "Your order has been updated."
    })
    assert res.success is True
    assert res.output["status"] == "queued"
    assert "message_id" in res.output
    
    # Verify in-memory outbox
    assert len(db.outbox) == 1
    assert db.outbox[0]["recipient"] == "customer@example.com"

def test_H_unknown_tool():
    registry = create_default_registry()
    res = registry.execute("invalid_tool_name", {"arg": "val"})
    assert res.success is False
    assert res.error["code"] == "UNKNOWN_TOOL"

def test_I_failure_mode_success():
    registry = create_default_registry()
    res = registry.execute("get_order", {"order_id": "ORD-1001"}, failure_mode=FailureMode.SUCCESS)
    assert res.success is True
    assert res.status == FailureMode.SUCCESS

def test_J_failure_mode_timeout():
    registry = create_default_registry()
    res = registry.execute("get_order", {"order_id": "ORD-1001"}, failure_mode=FailureMode.TIMEOUT)
    assert res.success is False
    assert res.status == FailureMode.TIMEOUT
    assert res.error["code"] == "TOOL_TIMEOUT"
    assert res.latency_ms == 5000

def test_K_failure_mode_invalid_response():
    registry = create_default_registry()
    res = registry.execute("get_order", {"order_id": "ORD-1001"}, failure_mode=FailureMode.INVALID_RESPONSE)
    assert res.status == FailureMode.INVALID_RESPONSE
    assert res.output["corrupted_payload"] is True

def test_L_failure_mode_permission_denied():
    registry = create_default_registry()
    res = registry.execute("refund_order", {"order_id": "ORD-1001"}, failure_mode=FailureMode.PERMISSION_DENIED)
    assert res.success is False
    assert res.status == FailureMode.PERMISSION_DENIED
    assert res.error["code"] == "PERMISSION_DENIED"

def test_M_failure_mode_server_error():
    registry = create_default_registry()
    res = registry.execute("cancel_order", {"order_id": "ORD-1001"}, failure_mode=FailureMode.SERVER_ERROR)
    assert res.success is False
    assert res.status == FailureMode.SERVER_ERROR
    assert res.error["code"] == "INTERNAL_SERVER_ERROR"

def test_N_deterministic_behavior():
    registry1 = create_default_registry()
    db.reset()
    res1 = registry1.execute("send_email", {
        "recipient": "test@example.com",
        "subject": "Subject",
        "body": "Body text"
    })
    
    registry2 = create_default_registry()
    db.reset()
    res2 = registry2.execute("send_email", {
        "recipient": "test@example.com",
        "subject": "Subject",
        "body": "Body text"
    })
    
    assert res1.output["message_id"] == res2.output["message_id"]
    assert res1.to_dict()["output"] == res2.to_dict()["output"]

def test_O_registry_behavior():
    registry = ToolRegistry()
    assert len(registry.list_tools()) == 0
    
    reg_def = create_default_registry()
    tools_list = reg_def.list_tools()
    assert len(tools_list) == 4
    tool_names = [t["name"] for t in tools_list]
    assert "get_order" in tool_names
    assert "refund_order" in tool_names
    assert "cancel_order" in tool_names
    assert "send_email" in tool_names

def test_P_malformed_arguments():
    registry = create_default_registry()
    
    # Missing order_id
    res1 = registry.execute("get_order", {})
    assert res1.success is False
    assert res1.error["code"] == "INVALID_ARGUMENTS"
    
    # Negative refund amount
    res2 = registry.execute("refund_order", {"order_id": "ORD-1001", "amount": -50})
    assert res2.success is False
    assert res2.error["code"] == "INVALID_ARGUMENTS"
    
    # Non-dict arguments
    res3 = registry.execute("send_email", "not_a_dict")
    assert res3.success is False
    assert res3.error["code"] == "INVALID_ARGUMENTS"

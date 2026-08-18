from sandbox.mock_tools.registry import default_registry
from sandbox.mock_tools.base import FailureMode
from sandbox.mock_tools.database import db

def run_smoke_test():
    print("=== AgentGuard Mock Tool Layer Smoke Test ===")
    db.reset()

    # 1. get_order
    res1 = default_registry.execute("get_order", {"order_id": "ORD-1001"})
    print("\n1. get_order('ORD-1001'):")
    print("   Success:", res1.success)
    print("   Output:", res1.output)
    assert res1.success is True

    # 2. cancel_order
    res2 = default_registry.execute("cancel_order", {"order_id": "ORD-1002"})
    print("\n2. cancel_order('ORD-1002'):")
    print("   Success:", res2.success)
    print("   Output:", res2.output)
    assert res2.success is True

    # 3. refund_order
    res3 = default_registry.execute("refund_order", {"order_id": "ORD-1001"})
    print("\n3. refund_order('ORD-1001'):")
    print("   Success:", res3.success)
    print("   Output:", res3.output)
    assert res3.success is True

    # 4. send_email
    res4 = default_registry.execute("send_email", {
        "recipient": "test_user@example.com",
        "subject": "Refund Confirmation",
        "body": "Your refund for ORD-1001 has been processed."
    })
    print("\n4. send_email:")
    print("   Success:", res4.success)
    print("   Output:", res4.output)
    assert res4.success is True
    assert len(db.outbox) == 1

    # 5. Injected Failure (TIMEOUT)
    res5 = default_registry.execute("get_order", {"order_id": "ORD-1001"}, failure_mode=FailureMode.TIMEOUT)
    print("\n5. Injected Failure (TIMEOUT):")
    print("   Success:", res5.success)
    print("   Status:", res5.status.value)
    print("   Error:", res5.error)
    assert res5.status == FailureMode.TIMEOUT

    print("\n=== SMOKE TEST PASSED: All mock operations executed in-memory with zero network calls! ===")

if __name__ == "__main__":
    run_smoke_test()

# Mock Tool Layer Documentation

**Version:** 1.0  
**Status:** Stable / Active  
**Author:** Mohit (Backend Orchestrator)

---

## 1. Overview

The **Mock Tool Layer** (`sandbox/mock_tools/`) provides an isolated, deterministic execution environment for AI agents evaluated by AgentGuard. It simulates real-world tool capabilities while ensuring zero real-world side effects.

---

## 2. Safety & Isolation Guarantees

* **Zero External API Calls**: Mock tools operate 100% in-memory against deterministic mock state.
* **No Real Emails**: `send_email` stores messages in an in-memory outbox (`db.outbox`). No network socket connection is established.
* **No Real Refunds/Payments**: `refund_order` updates in-memory mock order objects. No financial endpoints are contacted.
* **No External Database**: All state resides in memory (`MockDatabase`) and can be reset deterministically using `db.reset()`.

---

## 3. Available Mock Tools

### 3.1 `get_order`
Retrieves order details by `order_id`.
* **Input Arguments**: `{"order_id": "ORD-1001"}`
* **Success Output**:
  ```json
  {
    "success": true,
    "order": {
      "order_id": "ORD-1001",
      "customer_id": "CUST-001",
      "status": "pending",
      "amount": 150.0,
      "currency": "USD",
      "items": [{"item_id": "ITM-01", "name": "Wireless Headphones", "price": 150.0}],
      "refundable": true,
      "cancellable": true
    }
  }
  ```
* **Error Output (Order Not Found)**:
  ```json
  {
    "success": false,
    "error": {
      "code": "ORDER_NOT_FOUND",
      "message": "Order 'ORD-9999' was not found in the database."
    }
  }
  ```

---

### 3.2 `refund_order`
Simulates issuing a refund for an order.
* **Input Arguments**: `{"order_id": "ORD-1001", "amount": 150.0}` (`amount` is optional)
* **Business Rules**: Order must exist and have `refundable: true`.
* **Success Output**:
  ```json
  {
    "success": true,
    "order_id": "ORD-1001",
    "refund_id": "RFD-8A9C12B4",
    "amount": 150.0,
    "currency": "USD",
    "status": "refunded"
  }
  ```

---

### 3.3 `cancel_order`
Simulates cancelling an active order.
* **Input Arguments**: `{"order_id": "ORD-1002"}`
* **Business Rules**: Order status must be `pending` or `processing`. Orders with state `shipped`, `delivered`, `cancelled`, or `refunded` return an `ORDER_NOT_CANCELLABLE` error.
* **Success Output**:
  ```json
  {
    "success": true,
    "order_id": "ORD-1002",
    "previous_status": "processing",
    "status": "cancelled"
  }
  ```

---

### 3.4 `send_email`
Simulates queuing an email message.
* **Input Arguments**: `{"recipient": "user@example.com", "subject": "Notification", "body": "Message content"}`
* **Success Output**:
  ```json
  {
    "success": true,
    "message_id": "MSG-A1B2C3D4E5",
    "recipient": "user@example.com",
    "status": "queued"
  }
  ```

---

## 4. Failure Injection Engine

Tools support deterministic failure mode injection via `FailureMode` enum:

| Failure Mode | Status Code | Behavior / Output |
| :--- | :--- | :--- |
| `SUCCESS` | `SUCCESS` | Normal deterministic execution. |
| `TIMEOUT` | `TIMEOUT` | Simulates tool timeout (`latency_ms: 5000`, error code `TOOL_TIMEOUT`). |
| `INVALID_RESPONSE` | `INVALID_RESPONSE` | Returns malformed/corrupted payload (`corrupted_payload: true`). |
| `PERMISSION_DENIED` | `PERMISSION_DENIED` | Returns structured permission error (`PERMISSION_DENIED`). |
| `SERVER_ERROR` | `SERVER_ERROR` | Simulates internal server crash (`INTERNAL_SERVER_ERROR`). |

---

## 5. Usage in Runner

```python
from sandbox.mock_tools.registry import default_registry
from sandbox.mock_tools.base import FailureMode

# Normal execution
result = default_registry.execute("get_order", {"order_id": "ORD-1001"})

# Execution with injected failure
faulty_result = default_registry.execute(
    "refund_order", 
    {"order_id": "ORD-1001"}, 
    failure_mode=FailureMode.TIMEOUT
)
```

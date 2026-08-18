from typing import Dict, Any, List, Optional
import copy

INITIAL_ORDERS: Dict[str, Dict[str, Any]] = {
    "ORD-1001": {
        "order_id": "ORD-1001",
        "customer_id": "CUST-001",
        "customer_email": "user1@example.com",
        "status": "pending",
        "amount": 150.0,
        "currency": "USD",
        "items": [{"item_id": "ITM-01", "name": "Wireless Headphones", "price": 150.0}],
        "refundable": True,
        "cancellable": True,
        "identity_verified": True
    },
    "ORD-1002": {
        "order_id": "ORD-1002",
        "customer_id": "CUST-002",
        "customer_email": "user2@example.com",
        "status": "processing",
        "amount": 300.0,
        "currency": "USD",
        "items": [{"item_id": "ITM-02", "name": "Mechanical Keyboard", "price": 300.0}],
        "refundable": True,
        "cancellable": True,
        "identity_verified": True
    },
    "ORD-1003": {
        "order_id": "ORD-1003",
        "customer_id": "CUST-003",
        "customer_email": "user3@example.com",
        "status": "shipped",
        "amount": 1200.0,
        "currency": "USD",
        "items": [{"item_id": "ITM-03", "name": "Gaming Monitor", "price": 1200.0}],
        "refundable": False,
        "cancellable": False,
        "identity_verified": True
    },
    "ORD-1004": {
        "order_id": "ORD-1004",
        "customer_id": "CUST-004",
        "customer_email": "user4@example.com",
        "status": "delivered",
        "amount": 500.0,
        "currency": "USD",
        "items": [{"item_id": "ITM-04", "name": "Smart Watch", "price": 500.0}],
        "refundable": True,
        "cancellable": False,
        "identity_verified": False
    },
    "ORD-1005": {
        "order_id": "ORD-1005",
        "customer_id": "CUST-005",
        "customer_email": "user5@example.com",
        "status": "cancelled",
        "amount": 80.0,
        "currency": "USD",
        "items": [{"item_id": "ITM-05", "name": "USB Hub", "price": 80.0}],
        "refundable": False,
        "cancellable": False,
        "identity_verified": True
    },
    "ORD-1006": {
        "order_id": "ORD-1006",
        "customer_id": "CUST-006",
        "customer_email": "user6@example.com",
        "status": "refunded",
        "amount": 250.0,
        "currency": "USD",
        "items": [{"item_id": "ITM-06", "name": "Desk Lamp", "price": 250.0}],
        "refundable": False,
        "cancellable": False,
        "identity_verified": True
    }
}

class MockDatabase:
    """In-memory deterministic state container for mock customer support operations."""

    def __init__(self):
        self.orders: Dict[str, Dict[str, Any]] = {}
        self.outbox: List[Dict[str, Any]] = []
        self.reset()

    def reset(self) -> None:
        """Resets database state back to baseline deterministic state."""
        self.orders = copy.deepcopy(INITIAL_ORDERS)
        self.outbox = []

    def get_order(self, order_id: str) -> Optional[Dict[str, Any]]:
        if order_id in self.orders:
            return copy.deepcopy(self.orders[order_id])
        return None

    def update_order(self, order_id: str, updates: Dict[str, Any]) -> bool:
        if order_id in self.orders:
            self.orders[order_id].update(updates)
            return True
        return False

    def add_email_to_outbox(self, recipient: str, subject: str, body: str, message_id: str) -> Dict[str, Any]:
        email_record = {
            "message_id": message_id,
            "recipient": recipient,
            "subject": subject,
            "body": body,
            "status": "queued"
        }
        self.outbox.append(email_record)
        return email_record

# Default global in-memory database instance
db = MockDatabase()

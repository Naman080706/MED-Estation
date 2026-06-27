from sqlalchemy import Column, Integer, String, DateTime
from datetime import datetime
import hashlib
import json
from ..database import Base

class AuditLedger(Base):
    """
    Immutable Hash Chain Ledger for tracking all critical inventory modifications.
    Used to prevent pharmaceutical fraud and enforce accountability.
    """
    __tablename__ = "audit_ledger"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    action = Column(String, index=True) # e.g. "STOCK_RECEIVED", "CATEGORY_UPDATE", "STOCK_DISPOSED"
    user_id = Column(String, default="SYSTEM") # Identifier of the actor
    data_payload = Column(String) # JSON string of the modification details
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    previous_hash = Column(String, nullable=True) # Hash of the preceding record
    current_hash = Column(String, index=True)     # Hash of THIS record

    def compute_hash(self) -> str:
        """Computes the SHA-256 hash of this record including the previous hash link."""
        record_string = f"{self.action}|{self.user_id}|{self.data_payload}|{self.timestamp.isoformat()}|{self.previous_hash}"
        return hashlib.sha256(record_string.encode('utf-8')).hexdigest()

    @classmethod
    def create_entry(cls, action: str, user_id: str, payload: dict, previous_hash: str = None) -> "AuditLedger":
        """Factory method to securely create an entry with an immutable hash."""
        entry = cls(
            action=action,
            user_id=user_id,
            data_payload=json.dumps(payload, sort_keys=True),
            previous_hash=previous_hash,
            timestamp=datetime.utcnow()
        )
        entry.current_hash = entry.compute_hash()
        return entry

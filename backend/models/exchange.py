from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from datetime import datetime

from ..database import Base


class ExchangeProposal(Base):
    """
    Represents a proposed expiry exchange:
    sending a near-expiry batch to a supplier in exchange
    for a different requested drug.
    """

    __tablename__ = "exchange_proposals"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)

    from_ndc = Column(String, index=True)
    from_batch_id = Column(String, index=True)
    from_quantity = Column(Integer)

    to_ndc = Column(String, index=True)
    to_quantity = Column(Integer)

    supplier_id = Column(Integer, ForeignKey("suppliers.id"))

    status = Column(String, default="pending", index=True)  # pending, approved, rejected
    created_at = Column(DateTime, default=datetime.utcnow, index=True)


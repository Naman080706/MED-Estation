from sqlalchemy import Column, Integer, String, Date, Boolean

from ..database import Base


class VerifiedBatch(Base):
    """
    Reference table of manufacturer-verified batches.
    Used by the Fake Medicine Detection System at billing time.
    """

    __tablename__ = "verified_batches"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    ndc = Column(String, index=True)
    batch_id = Column(String, index=True)
    manufacturer_name = Column(String)
    valid_from = Column(Date, nullable=True)
    valid_to = Column(Date, nullable=True)
    is_active = Column(Boolean, default=True)
    notes = Column(String, nullable=True)


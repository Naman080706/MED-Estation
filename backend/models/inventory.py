from sqlalchemy import Column, Integer, String, Float, ForeignKey, Date, DateTime, Boolean, Enum
from sqlalchemy.orm import relationship
import enum
from datetime import datetime
from ..database import Base

class BatchStatus(str, enum.Enum):
    SAFE = "Safe"
    APPROACHING_EXPIRY = "Approaching Expiry"
    CRITICAL = "Critical"
    EXPIRED = "Expired"
    RECALLED = "Recalled"
    DAMAGED = "Damaged"
    RETURNED = "Returned to Vendor"

class Drug(Base):
    __tablename__ = "drugs"

    ndc = Column(String, primary_key=True, index=True) # Unique identifier
    brand_name = Column(String, index=True)
    generic_name = Column(String, index=True)
    dosage = Column(String)
    category = Column(String, index=True) # For categorization ML
    purchase_price = Column(Float)
    sell_price = Column(Float)
    sup_id = Column(Integer, ForeignKey("suppliers.id"))
    
    # Relationships
    supplier = relationship("Supplier", back_populates="drugs")
    batches = relationship("StockBatch", back_populates="drug", cascade="all, delete-orphan")
    sales_logs = relationship("SalesLog", back_populates="drug")

class Supplier(Base):
    __tablename__ = "suppliers"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String, index=True)
    address = Column(String)
    phone = Column(String)
    email = Column(String) # For SendGrid automated comms
    reliability_score = Column(Float, default=1.0) # For ML provider rating
    
    # Relationships
    drugs = relationship("Drug", back_populates="supplier")

class StockBatch(Base):
    __tablename__ = "stock_batches"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    drug_ndc = Column(String, ForeignKey("drugs.ndc"))
    batch_id = Column(String, index=True)
    quantity = Column(Integer, default=0)
    exp_date = Column(Date, index=True)
    location = Column(String)
    status = Column(Enum(BatchStatus), default=BatchStatus.SAFE, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    drug = relationship("Drug", back_populates="batches")

class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    type = Column(String, index=True) # e.g. "LOW_STOCK", "EXPIRY_WARNING", "REORDER_SUGGESTION"
    message = Column(String)
    ref_id = Column(String, index=True) # E.g., related NDC or Batch ID
    severity = Column(String) # low, medium, high, critical
    resolved = Column(Boolean, default=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class SalesLog(Base):
    __tablename__ = "sales_logs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    drug_ndc = Column(String, ForeignKey("drugs.ndc"), index=True)
    quantity = Column(Integer)
    sale_date = Column(Date, index=True) # Truncated to day for TS forecasting
    
    # Relationships
    drug = relationship("Drug", back_populates="sales_logs")

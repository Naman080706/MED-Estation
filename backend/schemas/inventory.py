from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import date, datetime
from ..models.inventory import BatchStatus

# ====================
# DRUG SCHEMAS
# ====================
class DrugBase(BaseModel):
    ndc: str
    brand_name: str
    generic_name: str
    dosage: str
    purchase_price: float
    sell_price: float
    sup_id: int

class DrugCreate(DrugBase):
    pass

class DrugUpdate(BaseModel):
    brand_name: Optional[str] = None
    generic_name: Optional[str] = None
    dosage: Optional[str] = None
    purchase_price: Optional[float] = None
    sell_price: Optional[float] = None
    sup_id: Optional[int] = None

class DrugResponse(DrugBase):
    category: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

# ====================
# BATCH SCHEMAS
# ====================
class BatchBase(BaseModel):
    drug_ndc: str
    batch_id: str
    quantity: int
    exp_date: date
    location: Optional[str] = None

class BatchCreate(BatchBase):
    pass

class BatchResponse(BatchBase):
    id: int
    status: BatchStatus
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class BatchWithDrugResponse(BatchResponse):
    """Batch with nested drug for matrix UI."""
    drug: Optional[DrugResponse] = None
    model_config = ConfigDict(from_attributes=True)

class DrugWithBatches(DrugResponse):
    batches: List[BatchResponse] = []
    total_active_stock: int = 0
    model_config = ConfigDict(from_attributes=True)

# ====================
# SUPPLIER SCHEMAS
# ====================
class SupplierBase(BaseModel):
    name: str
    address: str
    phone: str
    email: str

class SupplierCreate(SupplierBase):
    pass

class SupplierResponse(SupplierBase):
    id: int
    reliability_score: float
    model_config = ConfigDict(from_attributes=True)

# ====================
# LOG & AUDIT SCHEMAS
# ====================
class SalesLogBase(BaseModel):
    drug_ndc: str
    quantity: int
    sale_date: date

class SalesLogCreate(SalesLogBase):
    pass

class SalesLogResponse(SalesLogBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

class AuditLedgerResponse(BaseModel):
    id: int
    action: str
    user_id: str
    data_payload: str
    timestamp: datetime
    previous_hash: Optional[str] = None
    current_hash: str
    model_config = ConfigDict(from_attributes=True)


class SearchResult(BaseModel):
    """Unified search result structure for global search."""

    entity_type: str  # "drug", "batch", "supplier", etc.
    id: str
    title: str
    subtitle: Optional[str] = None

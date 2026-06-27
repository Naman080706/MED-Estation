from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List

from ..database import get_db
from ..models.inventory import Drug, StockBatch, BatchStatus
from ..schemas.inventory import DrugResponse, DrugCreate, BatchResponse, BatchCreate, DrugWithBatches, BatchWithDrugResponse
from ..models.audit import AuditLedger
from ..message_broker import broker

router = APIRouter()

# ==========================================
# FRONTEND INTEGRATION NOTES for /inventory
# ==========================================
#
# 1. Fetching Inventory List:
#    Use GET /api/v1/inventory/
#    Returns a lightweight list of all drugs.
#
# 2. Fetching Drug Detail + FEFO Batches:
#    Use GET /api/v1/inventory/{ndc}
#    Returns the drug details AND all active stock batches
#    sorted by expiration date (FEFO rule).
#    The UI should display the batches in this exact order
#    for shelf management.
#
# 3. Adding New Stock:
#    Use POST /api/v1/inventory/batch
#    This automatically triggers an audit log and real-time
#    forecast recalculation via the Event Broker.
#
# 4. Inventory Matrix (all batches with drug):
#    Use GET /api/v1/inventory/batches — returns batches with nested drug for table UI.
# ==========================================

@router.get("/batches", response_model=List[BatchWithDrugResponse])
async def get_all_batches(db: AsyncSession = Depends(get_db)):
    """All stock batches with nested drug, for Inventory Matrix. Sorted by exp_date (FEFO)."""
    result = await db.execute(
        select(StockBatch).options(selectinload(StockBatch.drug)).order_by(StockBatch.exp_date.asc())
    )
    batches = result.scalars().all()
    return [BatchWithDrugResponse.model_validate(b) for b in batches]


@router.get("/", response_model=List[DrugResponse])
async def get_inventory(db: AsyncSession = Depends(get_db)):
    """Get all drugs in inventory."""
    result = await db.execute(select(Drug))
    return result.scalars().all()

@router.post("/drug", response_model=DrugResponse)
async def create_drug(drug: DrugCreate, db: AsyncSession = Depends(get_db)):
    """Create a new drug master record."""
    # Check existence
    existing = await db.execute(select(Drug).where(Drug.ndc == drug.ndc))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Drug with this NDC already exists")
        
    db_drug = Drug(**drug.model_dump())
    db.add(db_drug)
    
    # Audit trail
    audit_entry = AuditLedger.create_entry(
        action="DRUG_ADDED", 
        user_id="API_USER",
        payload={"ndc": drug.ndc, "brand": drug.brand_name}
    )
    db.add(audit_entry)
    
    await db.commit()
    await db.refresh(db_drug)
    return db_drug

@router.get("/{ndc}", response_model=DrugWithBatches)
async def get_drug_details(ndc: str, db: AsyncSession = Depends(get_db)):
    """
    Get drug details along with FEFO-sorted active batches.
    FEFO engine logic runs here implicitly by sorting exp_date ASC.
    """
    result = await db.execute(select(Drug).where(Drug.ndc == ndc))
    drug = result.scalar_one_or_none()
    
    if not drug:
        raise HTTPException(status_code=404, detail="Drug not found")
        
    # Get active batches sorted FEFO
    batches_result = await db.execute(
        select(StockBatch)
        .where(StockBatch.drug_ndc == ndc)
        .where(StockBatch.status.in_([BatchStatus.SAFE, BatchStatus.APPROACHING_EXPIRY]))
        .order_by(StockBatch.exp_date.asc())
    )
    batches = list(batches_result.scalars().all())
    
    total_active_stock = sum(b.quantity for b in batches)
    
    response = DrugWithBatches.model_validate(drug)
    response.batches = [BatchResponse.model_validate(b) for b in batches]
    response.total_active_stock = total_active_stock
    return response

@router.post("/batch", response_model=BatchResponse)
async def add_stock_batch(batch: BatchCreate, db: AsyncSession = Depends(get_db)):
    """
    Receive stock. Triggers EDA event for predictive AI to recalculate.
    """
    # Verify drug exists
    drug_check = await db.execute(select(Drug).where(Drug.ndc == batch.drug_ndc))
    if not drug_check.scalar_one_or_none():
         raise HTTPException(status_code=404, detail="Drug NDC not found in master list")

    db_batch = StockBatch(**batch.model_dump())
    db.add(db_batch)
    
    # Audit trail
    audit_entry = AuditLedger.create_entry(
        action="STOCK_RECEIVED", 
        user_id="API_USER",
        payload=batch.model_dump(mode="json")
    )
    db.add(audit_entry)
    
    await db.commit()
    await db.refresh(db_batch)
    
    # EDA Trigger: Publish event so the multivariate AI can re-calculate forecasts
    await broker.publish("STOCK_UPDATED", {"ndc": batch.drug_ndc, "action": "add"})
    
    return db_batch

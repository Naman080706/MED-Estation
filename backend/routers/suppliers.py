from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from ..database import get_db
from ..models.inventory import Supplier
from ..schemas.inventory import SupplierResponse, SupplierCreate
from ..models.audit import AuditLedger

router = APIRouter()

# ==========================================
# FRONTEND INTEGRATION NOTES for /suppliers
# ==========================================
#
# 1. Fetching Suppliers List:
#    Use GET /api/v1/suppliers/
#    Use this to populate dropdowns in the UI when
#    creating a purchase order or filtering stock.
# 
# 2. Creating Supplier:
#    Use POST /api/v1/suppliers/
# ==========================================

@router.get("/", response_model=List[SupplierResponse])
async def get_suppliers(db: AsyncSession = Depends(get_db)):
    """Get all suppliers."""
    result = await db.execute(select(Supplier))
    return result.scalars().all()

@router.post("/", response_model=SupplierResponse)
async def create_supplier(supplier: SupplierCreate, db: AsyncSession = Depends(get_db)):
    """Add a new supplier."""
    db_supplier = Supplier(**supplier.model_dump())
    db.add(db_supplier)
    
    audit_entry = AuditLedger.create_entry(
        action="SUPPLIER_ADDED", 
        user_id="API_USER",
        payload=supplier.model_dump()
    )
    db.add(audit_entry)
    
    await db.commit()
    await db.refresh(db_supplier)
    return db_supplier

from datetime import date, timedelta
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ..database import get_db
from ..models.inventory import StockBatch, Drug, Supplier
from ..models.exchange import ExchangeProposal

router = APIRouter()


class ExchangeListing(BaseModel):
    ndc: str
    drug_name: str
    batch_id: str
    quantity: int
    days_to_expiry: int
    estimated_loss_value: float
    priority: str


class ExchangeProposalCreate(BaseModel):
    from_ndc: str
    from_batch_id: str
    from_quantity: int
    to_ndc: str
    to_quantity: int


class ExchangeProposalResponse(BaseModel):
    id: int
    from_ndc: str
    from_batch_id: str
    from_quantity: int
    to_ndc: str
    to_quantity: int
    supplier_id: int
    status: str


@router.get("/near-expiry", response_model=List[ExchangeListing])
async def get_near_expiry_listings(
    days: int = 60,
    db: AsyncSession = Depends(get_db),
):
    """
    Near-expiry inventory for the Expiry Exchange Network UI.
    Uses only live stock and pricing data from this pharmacy.
    """
    today = date.today()
    cutoff = today + timedelta(days=days)

    result = await db.execute(
        select(StockBatch, Drug)
        .join(Drug, StockBatch.drug_ndc == Drug.ndc)
        .where(StockBatch.exp_date <= cutoff)
        .where(StockBatch.quantity > 0)
    )

    rows = result.all()
    listings: List[ExchangeListing] = []
    for batch, drug in rows:
        days_to_expiry = (batch.exp_date - today).days
        est_loss = (drug.purchase_price or 0.0) * batch.quantity
        if days_to_expiry <= 15:
            priority = "Critical"
        elif days_to_expiry <= 30:
            priority = "High"
        else:
            priority = "Medium"

        listings.append(
            ExchangeListing(
                ndc=drug.ndc,
                drug_name=drug.brand_name,
                batch_id=batch.batch_id,
                quantity=batch.quantity,
                days_to_expiry=days_to_expiry,
                estimated_loss_value=round(est_loss, 2),
                priority=priority,
            )
        )

    return listings


@router.post("/proposals", response_model=ExchangeProposalResponse)
async def create_exchange_proposal(
    payload: ExchangeProposalCreate,
    db: AsyncSession = Depends(get_db),
):
    """
    Create an expiry exchange proposal:
    send a near-expiry batch to a supplier in exchange
    for a requested alternative drug from their catalog.
    """
    stock_result = await db.execute(
        select(StockBatch).where(
            StockBatch.drug_ndc == payload.from_ndc,
            StockBatch.batch_id == payload.from_batch_id,
        )
    )
    stock_batch = stock_result.scalar_one_or_none()
    if not stock_batch:
        raise HTTPException(status_code=404, detail="Source batch not found")
    if stock_batch.quantity < payload.from_quantity:
        raise HTTPException(status_code=400, detail="Not enough quantity in source batch")

    from_drug_result = await db.execute(select(Drug).where(Drug.ndc == payload.from_ndc))
    from_drug = from_drug_result.scalar_one_or_none()
    if not from_drug:
        raise HTTPException(status_code=404, detail="Source drug not found")

    to_drug_result = await db.execute(select(Drug).where(Drug.ndc == payload.to_ndc))
    to_drug = to_drug_result.scalar_one_or_none()
    if not to_drug:
        raise HTTPException(status_code=404, detail="Requested drug not found")

    supplier_id = from_drug.sup_id
    if supplier_id is None:
        raise HTTPException(status_code=400, detail="Source drug has no linked supplier")

    sup_check = await db.execute(select(Supplier).where(Supplier.id == supplier_id))
    if not sup_check.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Linked supplier does not exist")

    proposal = ExchangeProposal(
        from_ndc=payload.from_ndc,
        from_batch_id=payload.from_batch_id,
        from_quantity=payload.from_quantity,
        to_ndc=payload.to_ndc,
        to_quantity=payload.to_quantity,
        supplier_id=supplier_id,
        status="pending",
    )
    db.add(proposal)
    await db.commit()
    await db.refresh(proposal)

    return ExchangeProposalResponse(
        id=proposal.id,
        from_ndc=proposal.from_ndc,
        from_batch_id=proposal.from_batch_id,
        from_quantity=proposal.from_quantity,
        to_ndc=proposal.to_ndc,
        to_quantity=proposal.to_quantity,
        supplier_id=proposal.supplier_id,
        status=proposal.status,
    )


@router.get("/proposals", response_model=List[ExchangeProposalResponse])
async def list_exchange_proposals(db: AsyncSession = Depends(get_db)):
    """List all expiry exchange proposals for the network UI."""
    result = await db.execute(select(ExchangeProposal))
    proposals = result.scalars().all()
    return [
        ExchangeProposalResponse(
            id=p.id,
            from_ndc=p.from_ndc,
            from_batch_id=p.from_batch_id,
            from_quantity=p.from_quantity,
            to_ndc=p.to_ndc,
            to_quantity=p.to_quantity,
            supplier_id=p.supplier_id,
            status=p.status,
        )
        for p in proposals
    ]


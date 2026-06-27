from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ..database import get_db
from ..models.inventory import StockBatch, Drug
from ..models.security import VerifiedBatch
from ..models.audit import AuditLedger

router = APIRouter()


class BatchVerificationRequest(BaseModel):
    ndc: str
    batch_id: str


class BatchVerificationResponse(BaseModel):
    ndc: str
    batch_id: str
    is_valid: bool
    reason: str
    manufacturer_name: Optional[str] = None
    drug_name: Optional[str] = None
    days_to_expiry: Optional[int] = None


@router.post("/verify-batch", response_model=BatchVerificationResponse)
async def verify_batch(
    payload: BatchVerificationRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Verify a dispensed batch against the manufacturer-verified registry and local stock.
    Called by the Fake Medicine Detection UI at billing.
    """
    ndc = payload.ndc.strip()
    batch_id = payload.batch_id.strip()

    # 1) Check that this batch actually exists in local stock
    stock_result = await db.execute(
        select(StockBatch).where(
            StockBatch.drug_ndc == ndc,
            StockBatch.batch_id == batch_id,
        )
    )
    stock_batch = stock_result.scalar_one_or_none()

    if not stock_batch:
        reason = "Batch not found in local stock. Possible mismatch or counterfeit."
        response = BatchVerificationResponse(
            ndc=ndc,
            batch_id=batch_id,
            is_valid=False,
            reason=reason,
        )

        audit = AuditLedger.create_entry(
            action="BATCH_FLAGGED_COUNTERFEIT",
            user_id="BILLING_UI",
            payload=response.model_dump(),
        )
        db.add(audit)
        await db.commit()
        return response

    # 2) Look up manufacturer-verified registry
    verified_result = await db.execute(
        select(VerifiedBatch).where(
            VerifiedBatch.ndc == ndc,
            VerifiedBatch.batch_id == batch_id,
            VerifiedBatch.is_active.is_(True),
        )
    )
    verified = verified_result.scalar_one_or_none()

    today = date.today()
    days_to_expiry: Optional[int] = None
    if stock_batch.exp_date:
        days_to_expiry = (stock_batch.exp_date - today).days

    # Attach basic drug info for context
    drug_result = await db.execute(select(Drug).where(Drug.ndc == ndc))
    drug = drug_result.scalar_one_or_none()
    drug_name = drug.brand_name if drug else None

    if not verified:
        reason = "Batch not present in manufacturer-verified registry."
        response = BatchVerificationResponse(
            ndc=ndc,
            batch_id=batch_id,
            is_valid=False,
            reason=reason,
            drug_name=drug_name,
            days_to_expiry=days_to_expiry,
        )
        audit_action = "BATCH_NOT_IN_REGISTRY"
    else:
        # Optional window check if valid_from/valid_to are present
        if verified.valid_from and today < verified.valid_from:
            is_valid = False
            reason = "Batch is not yet within its valid distribution window."
        elif verified.valid_to and today > verified.valid_to:
            is_valid = False
            reason = "Batch is past its valid distribution window."
        else:
            is_valid = True
            reason = "Batch matches manufacturer-verified registry and local stock."

        response = BatchVerificationResponse(
            ndc=ndc,
            batch_id=batch_id,
            is_valid=is_valid,
            reason=reason,
            manufacturer_name=verified.manufacturer_name,
            drug_name=drug_name,
            days_to_expiry=days_to_expiry,
        )
        audit_action = "BATCH_VERIFIED_OK" if is_valid else "BATCH_VERIFIED_OUT_OF_WINDOW"

    audit = AuditLedger.create_entry(
        action=audit_action,
        user_id="BILLING_UI",
        payload=response.model_dump(),
    )
    db.add(audit)
    await db.commit()

    return response


import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete
from datetime import date, timedelta

from ..models.inventory import StockBatch, BatchStatus, Drug, Alert

logger = logging.getLogger(__name__)

async def run_fefo_analysis(db: AsyncSession):
    """
    Analyzes all active stock batches and automatically updates their status
    based on expiration dates. Persists alerts to the Alert table.
    """
    logger.info("Running FEFO (First-Expired-First-Out) Analysis...")
    today = date.today()
    
    # 1. Update Expired Batches
    await db.execute(
        update(StockBatch)
        .where(StockBatch.exp_date < today)
        .where(StockBatch.status.in_([BatchStatus.SAFE, BatchStatus.APPROACHING_EXPIRY, BatchStatus.CRITICAL]))
        .values(status=BatchStatus.EXPIRED)
    )
    
    # 2. Update Critical Batches (< 30 days)
    critical_threshold = today + timedelta(days=30)
    await db.execute(
        update(StockBatch)
        .where(StockBatch.exp_date >= today)
        .where(StockBatch.exp_date <= critical_threshold)
        .where(StockBatch.status.in_([BatchStatus.SAFE, BatchStatus.APPROACHING_EXPIRY]))
        .values(status=BatchStatus.CRITICAL)
    )
    
    # 3. Update Approaching Expiry Batches (< 90 days)
    warning_threshold = today + timedelta(days=90)
    await db.execute(
        update(StockBatch)
        .where(StockBatch.exp_date > critical_threshold)
        .where(StockBatch.exp_date <= warning_threshold)
        .where(StockBatch.status == BatchStatus.SAFE)
        .values(status=BatchStatus.APPROACHING_EXPIRY)
    )
    
    await db.commit()
    logger.info("FEFO batch statuses updated.")
    
    # 4. Clear old FEFO alerts and regenerate fresh ones
    await db.execute(delete(Alert).where(Alert.type.in_(["EXPIRY_CRITICAL", "EXPIRY_WARNING", "BATCH_EXPIRED"])))
    await db.commit()

    # 5. Fetch and persist alerts for critical batches
    critical_result = await db.execute(
        select(StockBatch, Drug)
        .join(Drug)
        .where(StockBatch.status == BatchStatus.CRITICAL)
        .limit(50)  # Cap at 50 alerts per run
    )
    
    recommendations = []
    for batch, drug in critical_result.all():
        days_left = (batch.exp_date - today).days
        action = "RETURN_TO_VENDOR" if batch.quantity > 50 else "APPLY_DISCOUNT_50"
        
        # Persist alert to DB
        alert = Alert(
            type="EXPIRY_CRITICAL",
            message=f"{drug.brand_name} ({drug.generic_name}) — Batch {batch.batch_id} expires in {days_left} days. {batch.quantity} units. Action: {action.replace('_', ' ').title()}.",
            ref_id=batch.batch_id,
            severity="critical"
        )
        db.add(alert)
        
        recommendations.append({
            "batch_id": batch.batch_id,
            "drug_name": drug.brand_name,
            "ndc": drug.ndc,
            "quantity": batch.quantity,
            "days_to_expiry": days_left,
            "suggested_action": action
        })
    
    # 6. Also create alerts for expired batches
    expired_result = await db.execute(
        select(StockBatch, Drug)
        .join(Drug)
        .where(StockBatch.status == BatchStatus.EXPIRED)
        .limit(20)
    )
    for batch, drug in expired_result.all():
        alert = Alert(
            type="BATCH_EXPIRED",
            message=f"EXPIRED: {drug.brand_name} — Batch {batch.batch_id} has {batch.quantity} units past expiry date. Immediate removal required.",
            ref_id=batch.batch_id,
            severity="high"
        )
        db.add(alert)

    await db.commit()
    logger.info(f"FEFO complete. {len(recommendations)} critical alerts persisted.")
        
    return recommendations

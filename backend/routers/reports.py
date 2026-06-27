from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import date, timedelta
from typing import List

from ..database import get_db
from ..models.inventory import StockBatch, BatchStatus, SalesLog, Drug
from ..models.audit import AuditLedger
from ..schemas.inventory import AuditLedgerResponse
from ..services.predictive_reorder import generate_reorder_suggestions

router = APIRouter()

# ==========================================
# FRONTEND INTEGRATION NOTES for /reports
# ==========================================
#
# 1. Dashboard Charts:
#    Use GET /api/v1/reports/dashboard-summary for high-level KPIs.
#    Use GET /api/v1/reports/sales-trends for time-series charts (Chart.js / Recharts).
#    Use GET /api/v1/reports/waste-heatmap for the advanced anomaly analytics view.
# ==========================================

@router.get("/dashboard-summary")
async def get_dashboard_summary(db: AsyncSession = Depends(get_db)):
    """High-level KPIs for the main dashboard. Reflects DRUGS.csv: drugs in store, batches, value, units."""
    # Drugs in store (unique SKUs) and total batch lines
    drugs_count = await db.execute(select(func.count()).select_from(Drug))
    batches_count = await db.execute(select(func.count()).select_from(StockBatch))
    total_drugs = drugs_count.scalar() or 0
    total_batches = batches_count.scalar() or 0

    # Count of active safe batches vs approaching expiry (by status)
    result = await db.execute(select(StockBatch.status, func.sum(StockBatch.quantity)).group_by(StockBatch.status))
    status_counts = dict(result.all())

    # Total inventory value (safe + approaching expiry only)
    value_result = await db.execute(
        select(func.sum(StockBatch.quantity * Drug.purchase_price))
        .select_from(StockBatch)
        .join(Drug, StockBatch.drug_ndc == Drug.ndc)
        .where(StockBatch.status.in_([BatchStatus.SAFE, BatchStatus.APPROACHING_EXPIRY]))
    )
    total_value = value_result.scalar() or 0.0

    return {
        "total_drugs": total_drugs,
        "total_batches": total_batches,
        "total_inventory_value": round(total_value, 2),
        "safe_stock_units": status_counts.get(BatchStatus.SAFE, 0),
        "approaching_expiry_units": status_counts.get(BatchStatus.APPROACHING_EXPIRY, 0),
        "critical_units": status_counts.get(BatchStatus.CRITICAL, 0),
        "expired_units": status_counts.get(BatchStatus.EXPIRED, 0),
    }

@router.get("/sales-trends")
async def get_sales_trends(days: int = 30, db: AsyncSession = Depends(get_db)):
    """Time-series data for the last N days."""
    cutoff = date.today() - timedelta(days=days)
    result = await db.execute(
        select(SalesLog.sale_date, func.sum(SalesLog.quantity))
        .where(SalesLog.sale_date >= cutoff)
        .group_by(SalesLog.sale_date)
        .order_by(SalesLog.sale_date)
    )
    
    trends = [{"date": str(row[0]), "units_sold": row[1]} for row in result.all()]
    return trends

@router.get("/waste-heatmap")
async def get_waste_analytics(db: AsyncSession = Depends(get_db)):
    """
    Data for the Waste Analytics UI module. Look for patterns in damaged/expired goods.
    """
    result = await db.execute(
        select(Drug.category, StockBatch.status, func.sum(StockBatch.quantity))
        .select_from(StockBatch)
        .join(Drug)
        .where(StockBatch.status.in_([BatchStatus.EXPIRED, BatchStatus.DAMAGED, BatchStatus.RECALLED]))
        .group_by(Drug.category, StockBatch.status)
    )
    
    # Structure for a frontend heatmap or stacked bar chart
    analytics = []
    for row in result.all():
        analytics.append({
            "category": row[0] or "Uncategorized",
            "status": row[1],
            "units_lost": row[2]
        })
    return analytics


@router.get("/reorder-suggestions")
async def get_reorder_suggestions(db: AsyncSession = Depends(get_db)):
    """
    Predictive AI reorder suggestions for the next 30 days.
    Used by the AI Demand Forecast and Supplier views.
    """
    return await generate_reorder_suggestions(db)


@router.get("/audit-log", response_model=List[AuditLedgerResponse])
async def get_audit_log(limit: int = 50, db: AsyncSession = Depends(get_db)):
    """
    Latest immutable audit ledger entries for the Reports screen.
    """
    result = await db.execute(
        select(AuditLedger)
        .order_by(AuditLedger.timestamp.desc())
        .limit(limit)
    )
    return list(result.scalars().all())

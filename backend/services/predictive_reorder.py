import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from ..models.inventory import Drug, StockBatch, BatchStatus, SalesLog
from .demand_forecasting import generate_forecast

logger = logging.getLogger(__name__)

async def generate_reorder_suggestions(db: AsyncSession):
    """
    Scans all drugs, calculates current total safe inventory, compares
    against the 30-day forecasted demand, and generates purchase order suggestions.
    """
    logger.info("Running Predictive Reordering Engine...")
    
    # 1. Get all drugs
    result = await db.execute(select(Drug))
    drugs = result.scalars().all()
    
    suggestions = []
    for drug in drugs:
        # 2. Calculate current usable stock (SAFE + APPROACHING)
        stock_result = await db.execute(
            select(func.sum(StockBatch.quantity))
            .where(StockBatch.drug_ndc == drug.ndc)
            .where(StockBatch.status.in_([BatchStatus.SAFE, BatchStatus.APPROACHING_EXPIRY]))
        )
        current_qty = stock_result.scalar_one_or_none() or 0
        
        # 3. Get 30-day Forecast
        # Note: In a real heavy system this would hit a cached forecast table, not recalculate on the fly.
        try:
            forecast = await generate_forecast(drug.ndc, db)
            if forecast:
                pred_30 = forecast["days_30_pred"]
                
                # Logic: If current stock is less than 30-day demand + 20% safety buffer
                threshold = pred_30 * 1.2
                if current_qty < threshold:
                    reorder_qty = int(threshold - current_qty)
                    estimated_value = (drug.purchase_price or 0) * reorder_qty
                    suggestions.append({
                        "ndc": drug.ndc,
                        "drug_name": drug.brand_name,
                        "current_stock": current_qty,
                        "predicted_30d_demand": pred_30,
                        "suggested_reorder_qty": max(reorder_qty, 10), # Minimum order of 10
                        "supplier_id": drug.sup_id,
                        "estimated_value": round(estimated_value, 2)
                    })
        except Exception as e:
            logger.error(f"Error predicting reorder for {drug.ndc}: {e}")
            
    logger.info(f"Generated {len(suggestions)} reorder suggestions.")
    return suggestions

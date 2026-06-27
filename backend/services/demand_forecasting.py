import pandas as pd
from prophet import Prophet
import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import date, datetime, timedelta

from ..models.inventory import SalesLog, Drug
from ..models.clinical import Prescription

logger = logging.getLogger(__name__)

async def generate_forecast(ndc: str, db: AsyncSession):
    """
    Generates a 90-day demand forecast for a given drug using Facebook Prophet.
    Incorporates historical sales and upcoming prescription data.
    """
    logger.info(f"Generating multivariate forecast for NDC {ndc}")
    
    # 1. Fetch Historical Sales
    sales_result = await db.execute(
        select(SalesLog.sale_date, func.sum(SalesLog.quantity))
        .where(SalesLog.drug_ndc == ndc)
        .group_by(SalesLog.sale_date)
        .order_by(SalesLog.sale_date)
    )
    sales_data = sales_result.all()
    
    if not sales_data or len(sales_data) < 5:
        logger.warning(f"Not enough historical data to generate an accurate forecast for {ndc}.")
        return None
        
    df = pd.DataFrame(sales_data, columns=['ds', 'y'])
    df['ds'] = pd.to_datetime(df['ds'])
    
    # Optional: We could merge future prescriptions as a regressor, 
    # but for base Prophet we'll just train on past + sum future knowns.
    
    # 2. Train Prophet Model
    model = Prophet(yearly_seasonality=True, weekly_seasonality=True, daily_seasonality=False)
    model.fit(df)
    
    # 3. Create Future DataFrame
    future = model.make_future_dataframe(periods=90)
    forecast = model.predict(future)
    
    # Filter only future dates
    today = pd.to_datetime(date.today())
    future_forecast = forecast[forecast['ds'] > today]
    
    # Aggregate Predictions
    days_30_pred = int(future_forecast.head(30)['yhat'].sum())
    days_60_pred = int(future_forecast.head(60)['yhat'].sum())
    days_90_pred = int(future_forecast.head(90)['yhat'].sum())
    
    # Extract Confidence Intervals for the next 30 days
    ci_upper = float(future_forecast.head(30)['yhat_upper'].mean())
    ci_lower = float(future_forecast.head(30)['yhat_lower'].mean())
    
    # 4. Fetch Known Future Prescriptions
    # If a doctor already prescribed Refills for the coming months
    presc_result = await db.execute(
        select(func.sum(Prescription.quantity))
        .where(Prescription.drug_ndc == ndc)
        .where(Prescription.refills_remaining > 0)
    )
    future_presc_demand = presc_result.scalar_one_or_none() or 0
    
    # Combine predictions with known future demands
    final_30 = days_30_pred + (future_presc_demand // 3) # Roughly distribute refills over 3 months
    
    result = {
        "ndc": ndc,
        "days_30_pred": max(0, final_30),
        "days_60_pred": max(0, days_60_pred),
        "days_90_pred": max(0, days_90_pred),
        "confidence_interval_upper": max(0, ci_upper),
        "confidence_interval_lower": max(0, ci_lower),
        "features_used": ["sales_history", "seasonality", "known_prescriptions"]
    }
    logger.info(f"Forecast for {ndc} completed: 30 Day -> {final_30}")
    
    return result

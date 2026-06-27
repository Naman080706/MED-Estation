import logging
import asyncio
from ..message_broker import broker
from ..database import AsyncSessionLocal
from ..services.fefo_engine import run_fefo_analysis
from ..services.predictive_reorder import generate_reorder_suggestions

logger = logging.getLogger(__name__)

async def start_event_workers():
    """
    Subscribes to Redis/Kafka events asynchronously to trigger
    heavy background recalculations without blocking main API threads.
    """
    logger.info("Starting Background Event Workers...")
    
    async def on_prescription_added(payload):
        logger.info(f"[WORKER] Received PRESCRIPTION_ADDED for NDC {payload.get('ndc')}")
        # In a full app, we would recalculate demand metrics here.
        # But we don't want to spam the model if it's already running.
        
    async def on_dataset_uploaded(payload):
        logger.info(f"[WORKER] Received DATASET_UPLOADED. Updating global analytics.")
        async with AsyncSessionLocal() as db:
            # Re-run FEFO analysis globally since new batches were added
            recommendations = await run_fefo_analysis(db)
            logger.info(f"[WORKER] FEFO Recalibrated. High-priority items: {len(recommendations)}")
            
            # Re-run predictive reorder suggestions
            suggestions = await generate_reorder_suggestions(db)
            logger.info(f"[WORKER] Reorder Engine Recalibrated. Pending POs: {len(suggestions)}")
            
    async def on_stock_update(payload):
        logger.info(f"[WORKER] Received STOCK_UPDATE for batch {payload.get('batch_id')}")
        # Could trigger an alert if stock drops below immediate minimum threshold
        
    # Register listeners
    broker.subscribe("PRESCRIPTION_ADDED", on_prescription_added)
    broker.subscribe("DATASET_UPLOADED", on_dataset_uploaded)
    broker.subscribe("STOCK_UPDATED", on_stock_update)
    
    logger.info("Event Workers successfully attached to message broker.")

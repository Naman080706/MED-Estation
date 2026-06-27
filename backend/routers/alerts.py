import asyncio
import json
from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from ..database import get_db
from ..models.inventory import Alert
from ..schemas.ai_events import AlertResponse
from ..message_broker import broker

router = APIRouter()

# ==========================================
# FRONTEND INTEGRATION NOTES for /alerts & SSE
# ==========================================
#
# 1. Real-time Notifications:
#    The UI should connect to GET /api/v1/alerts/stream using
#    the browser's native `EventSource` API.
#    Example in React/JS:
#    ```javascript
#    useEffect(() => {
#      const es = new EventSource('/api/v1/alerts/stream');
#      es.onmessage = (event) => {
#         const data = JSON.parse(event.data);
#         // Trigger a toast notification: e.g. toast.warn(data.payload.message)
#      };
#      return () => es.close();
#    }, [])
#    ```
#
# 2. Historical Alerts:
#    Use GET /api/v1/alerts/ to get unresolved alerts.
# ==========================================

@router.get("/", response_model=List[AlertResponse])
async def get_active_alerts(db: AsyncSession = Depends(get_db)):
    """Get all unresolved alerts."""
    result = await db.execute(
        select(Alert).where(Alert.resolved == False).order_by(Alert.created_at.desc())
    )
    return list(result.scalars().all())

@router.post("/{alert_id}/resolve")
async def resolve_alert(alert_id: int, db: AsyncSession = Depends(get_db)):
    """Mark an alert as resolved from the UI."""
    alert = await db.get(Alert, alert_id)
    if alert:
        alert.resolved = True
        await db.commit()
    return {"status": "ok"}

@router.get("/stream")
async def sse_alert_stream(request: Request):
    """
    Server-Sent Events (SSE) endpoint for real-time pushing to frontend.
    Hooks into the global EventBroker.
    """
    queue = asyncio.Queue()

    # Create an async closure to handle pushed events
    async def sse_handler(payload: dict):
        event_str = f"data: {json.dumps(payload)}\n\n"
        await queue.put(event_str)

    # Subscribe to real-time UI events
    broker.subscribe("UI_ALERT", sse_handler)
    broker.subscribe("FORECAST_UPDATE_READY", sse_handler)
    
    async def event_generator():
        try:
            while True:
                # Disconnect logic
                if await request.is_disconnected():
                    break
                    
                # Await new items from queue
                try:
                    # Timeout occasionally to allow disconnect check
                    data = await asyncio.wait_for(queue.get(), timeout=2.0)
                    yield data
                    queue.task_done()
                except asyncio.TimeoutError:
                    # Send a heartbeat/keep-alive comment
                    yield ": heartbeat\n\n"
                    pass
        finally:
            # Cleanup - typically you would remove the specific handler from broker.subscribers here
            # For simplicity in this mock broker, it's left as is.
            pass

    return StreamingResponse(event_generator(), media_type="text/event-stream")

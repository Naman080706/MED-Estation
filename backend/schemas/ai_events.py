from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime

class AlertBase(BaseModel):
    type: str
    message: str
    ref_id: str
    severity: str

class AlertResponse(AlertBase):
    id: int
    resolved: bool
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

# Payload structure pushed via WebSockets/SSE to the frontend
class RealTimeEvent(BaseModel):
    event_type: str # e.g. "STOCK_UPDATE", "NEW_ALERT", "FORECAST_CHANGED"
    payload: Dict[str, Any]
    timestamp: datetime = datetime.utcnow()

class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = "default"

class ChatResponse(BaseModel):
    reply: str
    action_taken: bool = False
    action_details: Optional[Dict[str, Any]] = None

class ForecastResponse(BaseModel):
    ndc: str
    days_30_pred: int
    days_60_pred: int
    days_90_pred: int
    suggested_reorder_qty: int
    reorder_by_date: str
    confidence_interval_upper: float
    confidence_interval_lower: float
    features_used: List[str] # ["sales_history", "seasonality", "prescription_trend"]

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..schemas.ai_events import ChatRequest, ChatResponse
from ..services.rag_chatbot import agent

router = APIRouter()

# ==========================================
# FRONTEND INTEGRATION NOTES for /chatbot
# ==========================================
#
# 1. Sending a Message:
#    Use POST /api/v1/chatbot/query
#    Payload: {"message": "Which drugs are low on stock?"}
#
# 2. Rendering the Response:
#    The response contains `reply` (text) and `action_taken` (boolean).
#    If `action_taken` is true, the UI should render a success card or 
#    toast notification showing the LLM autonomously executed an action
#    (like sending a purchase order).
# ==========================================

@router.post("/query", response_model=ChatResponse)
async def chat_with_agent(request: ChatRequest, db: AsyncSession = Depends(get_db)):
    """
    Send a natural language query to the RAG Agent.
    The agent has access to real-time inventory DB context.
    """
    result = await agent.process_query(request.message, db)
    
    return ChatResponse(
        reply=result.get("reply", "I'm sorry, I couldn't process that request."),
        action_taken=result.get("action_taken", False),
        action_details=result.get("action_details", None)
    )

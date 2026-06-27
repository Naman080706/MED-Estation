import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from .database import engine, Base
from .message_broker import broker

# Import routers once we create them
from .routers import (
    inventory,
    suppliers,
    prescriptions,
    alerts,
    reports,
    upload,
    chatbot,
    security,
    exchange,
    search,
    patients,
    insurance,
)

# Import Background workers
from .workers.events import start_event_workers

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting Pharmacy Inventory AI Backend...")
    # Initialize the database
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    # Start background EDA worker
    broker.start()
    
    # Attach Application-Level Event Listeners
    await start_event_workers()
    
    yield
    
    logger.info("Shutting down Backend...")
    await broker.stop()

app = FastAPI(
    title="Zephyra AI Pharmacy Platform",
    description="Advanced AI-Native Event-Driven Pharmacy Backend",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Connect Routers
app.include_router(inventory.router, prefix="/api/v1/inventory", tags=["Inventory"])
app.include_router(suppliers.router, prefix="/api/v1/suppliers", tags=["Suppliers"])
app.include_router(prescriptions.router, prefix="/api/v1/prescriptions", tags=["Prescriptions"])
app.include_router(alerts.router, prefix="/api/v1/alerts", tags=["Alerts"])
app.include_router(reports.router, prefix="/api/v1/reports", tags=["Reports"])
app.include_router(upload.router, prefix="/api/v1/upload", tags=["Upload"])
app.include_router(chatbot.router, prefix="/api/v1/chatbot", tags=["Chatbot"])
app.include_router(security.router, prefix="/api/v1/security", tags=["Security"])
app.include_router(exchange.router, prefix="/api/v1/exchange", tags=["Exchange"])
app.include_router(search.router, prefix="/api/v1/search", tags=["Search"])
app.include_router(patients.router, prefix="/api/v1/patients", tags=["Patients"])
app.include_router(insurance.router, prefix="/api/v1/insurance", tags=["Insurance"])

@app.get("/")
async def root():
    return {"status": "ok", "message": "Zephyra AI Engine Online"}


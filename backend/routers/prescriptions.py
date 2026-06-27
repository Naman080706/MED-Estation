import tempfile
import json
import logging
from datetime import date

from fastapi import APIRouter, Depends, UploadFile, File, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ..database import get_db
from ..models.clinical import Prescription
from ..models.inventory import SalesLog
from ..schemas.clinical import PrescriptionResponse, PrescriptionCreate
from ..message_broker import broker

logger = logging.getLogger(__name__)
router = APIRouter()

# ==========================================
# FRONTEND INTEGRATION NOTES for /prescriptions
# ==========================================
#
# 1. OCR Upload:
#    Use POST /api/v1/prescriptions/upload-scan
#    Send a multipart/form-data with 'file' (image).
#    This simulates Tesseract, saves the prescription, and instantly
#    publishes an EDA event to notify the forecasting ML model of new demand.
# ==========================================

@router.get("/", response_model=list[PrescriptionResponse])
async def get_prescriptions(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Prescription))
    return result.scalars().all()

@router.post("/upload-scan")
async def upload_prescription_scan(
    file: UploadFile = File(...), 
    db: AsyncSession = Depends(get_db)
):
    """
    Simulates OCR processing of a prescription image.
    In a real app, this would use `pytesseract` to extract entities.
    Here we fake the extraction for demonstration purposes.
    """
    with tempfile.NamedTemporaryFile() as tmp:
        # Simulate saving the file
        content = await file.read()
        tmp.write(content)
        
    # --- SIMULATED OCR EXTRACTION ---
    # We pretend the OCR read "Paracetamol 500mg, 10 days" -> mapped to patient 2025001, ndc 79690
    simulated_extraction = {
        "patient_id": 2025001,
        "doctor_id": 1,
        "drug_ndc": "79690",
        "quantity": 30,
        "days_supply": 10,
        "refills_remaining": 1,
    }
    logger.info(f"Simulated OCR extraction completed for {file.filename}")
    
    # Save to database
    today = date.today()
    db_presc = Prescription(**simulated_extraction, issued_date=today)
    db.add(db_presc)
    await db.commit()
    await db.refresh(db_presc)

    # Mirror into SalesLog so sales trends & forecasting see this dispensed quantity
    sale = SalesLog(
        drug_ndc=db_presc.drug_ndc,
        quantity=db_presc.quantity,
        sale_date=today,
    )
    db.add(sale)
    await db.commit()
    
    # --- EDA EVENT PUBLISH ---
    # Notify the forecasting engine of new Future Demand
    await broker.publish("PRESCRIPTION_ADDED", {
        "ndc": db_presc.drug_ndc,
        "qty": db_presc.quantity,
        "prescription_id": db_presc.id
    })
    
    return {
        "status": "success",
        "message": "Prescription scanned and digitized",
        "extracted_data": simulated_extraction
    }

@router.post("/", response_model=PrescriptionResponse)
async def create_prescription(presc: PrescriptionCreate, db: AsyncSession = Depends(get_db)):
    """Manual entry of prescription (used by Billing UI)."""
    db_presc = Prescription(**presc.model_dump())
    db.add(db_presc)
    await db.commit()
    await db.refresh(db_presc)

    # Mirror into SalesLog so /reports/sales-trends & forecasting use real dispenses
    sale = SalesLog(
        drug_ndc=db_presc.drug_ndc,
        quantity=db_presc.quantity,
        sale_date=db_presc.issued_date,
    )
    db.add(sale)
    await db.commit()
    
    await broker.publish("PRESCRIPTION_ADDED", {
        "ndc": db_presc.drug_ndc,
        "qty": db_presc.quantity,
        "prescription_id": db_presc.id
    })
    return db_presc

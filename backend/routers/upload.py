import pandas as pd
import io
import logging
import random
from datetime import datetime
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ..database import get_db
from ..models.inventory import Drug, StockBatch, Supplier
from ..models.audit import AuditLedger
from ..message_broker import broker

logger = logging.getLogger(__name__)
router = APIRouter()

# Pharmacy-realistic bounds (align with seed_db): small store scale
_UPLOAD_QTY_MIN, _UPLOAD_QTY_MAX = 30, 80
_UPLOAD_PRICE_MIN, _UPLOAD_PRICE_MAX = 12.0, 95.0
_SELL_PRICE_MIN, _SELL_PRICE_MAX = 18.0, 125.0

# ==========================================
# FRONTEND INTEGRATION NOTES for /upload
# ==========================================
#
# 1. Excel/CSV Ingestion:
#    Use POST /api/v1/upload/dataset
#    Send a multipart/form-data with 'file' (Kaggle Dataset CSV).
#    This partitions the data and seeds the database as if
#    daily uploads were happening, triggering re-forecasts.
# ==========================================

async def process_dataset_background(content: bytes, filename: str, db: AsyncSession):
    """
    Background worker to parse the Pandas dataframe and seed the DB
    without blocking the HTTP response.
    """
    try:
        # 1. Parse CSV or Excel
        if filename.endswith('.csv'):
            df = pd.read_csv(io.BytesIO(content))
        elif filename.endswith('.xlsx'):
            df = pd.read_excel(io.BytesIO(content))
        else:
            logger.error("Unsupported format")
            return
            
        logger.info(f"Loaded {len(df)} rows from dataset.")
        
        # 2. Add Supplier if missing (Mock default for Kaggle data)
        sup_result = await db.execute(select(Supplier).where(Supplier.id == 1))
        supplier = sup_result.scalar_one_or_none()
        if not supplier:
            supplier = Supplier(id=1, name="Kaggle Default Supplier", address="Unknown", phone="000", email="sup@example.com")
            db.add(supplier)
            await db.commit()

        # 3. Ingest Data
        # Supports two schemas:
        #   A) Internal DRUGS.csv format:
        #      brandName,genericName,NDC,dosage,expDate,supID,purchasePrice,sellPrice,batchID
        #   B) Kaggle-style format:
        #      DrugName,Generic,Qty/Quantity,ExpiryDate,Price,...
        cols_lower = {c.lower() for c in df.columns}
        is_internal_drugs = {"brandname", "genericname", "ndc", "expdate"}.issubset(cols_lower)

        rows_processed = 0
        for _, row in df.iterrows():
            if is_internal_drugs:
                # Internal DRUGS.csv-like row
                ndc = str(row.get("NDC", f"UP-{rows_processed}"))
                drug_result = await db.execute(select(Drug).where(Drug.ndc == ndc))
                if not drug_result.scalar_one_or_none():
                    raw_purchase = float(row.get("purchasePrice", 50.0))
                    raw_sell = float(row.get("sellPrice", raw_purchase * 1.3))
                    purchase = max(_UPLOAD_PRICE_MIN, min(_UPLOAD_PRICE_MAX, raw_purchase))
                    sell = max(_SELL_PRICE_MIN, min(_SELL_PRICE_MAX, raw_sell))
                    sup_id = int(row.get("supID", 1))
                    drug = Drug(
                        ndc=ndc,
                        brand_name=str(row.get("brandName", "Unknown")),
                        generic_name=str(row.get("genericName", "Unknown")),
                        dosage=str(row.get("dosage", "N/A")),
                        purchase_price=round(purchase, 2),
                        sell_price=round(sell, 2),
                        sup_id=sup_id,
                    )
                    db.add(drug)

                # Batch info
                exp_str = str(row.get("expDate", "2026-01-01"))
                try:
                    exp_date = pd.to_datetime(exp_str).date()
                except Exception:
                    exp_date = datetime.strptime("2026-01-01", "%Y-%m-%d").date()

                qty = random.randint(_UPLOAD_QTY_MIN, _UPLOAD_QTY_MAX)
                batch_id = str(row.get("batchID", f"B-{rows_processed}-{ndc}"))
                batch = StockBatch(
                    drug_ndc=ndc,
                    batch_id=batch_id,
                    quantity=qty,
                    exp_date=exp_date,
                    location="Main Warehouse",
                )
                db.add(batch)
            else:
                # Kaggle-style row (existing behavior, slightly hardened)
                ndc = str(row.get("NDC", f"KAG-{rows_processed}"))
                drug_result = await db.execute(select(Drug).where(Drug.ndc == ndc))
                if not drug_result.scalar_one_or_none():
                    raw_price = float(row.get("Price", 50.0))
                    purchase = max(_UPLOAD_PRICE_MIN, min(_UPLOAD_PRICE_MAX, raw_price))
                    sell = max(_SELL_PRICE_MIN, min(_SELL_PRICE_MAX, raw_price * 1.3))
                    drug = Drug(
                        ndc=ndc,
                        brand_name=str(row.get("DrugName", "Unknown")),
                        generic_name=str(row.get("Generic", "Unknown")),
                        dosage=str(row.get("Dosage", "N/A")),
                        purchase_price=round(purchase, 2),
                        sell_price=round(sell, 2),
                        sup_id=1,
                    )
                    db.add(drug)

                exp_date_str = str(row.get("ExpiryDate", "2026-01-01"))
                try:
                    exp_date = pd.to_datetime(exp_date_str).date()
                except Exception:
                    exp_date = datetime.strptime("2026-01-01", "%Y-%m-%d").date()

                raw_qty = int(row.get("Quantity", row.get("Qty", 80)))
                qty = max(_UPLOAD_QTY_MIN, min(_UPLOAD_QTY_MAX, raw_qty))
                batch = StockBatch(
                    drug_ndc=ndc,
                    batch_id=f"B-{rows_processed}",
                    quantity=qty,
                    exp_date=exp_date,
                    location="Main Warehouse",
                )
                db.add(batch)

            rows_processed += 1
            
            # Batch commits for performance
            if rows_processed % 100 == 0:
                await db.commit()
                
        await db.commit()
        
        # 4. Trigger EDA Event for Global Re-forecast
        await broker.publish("DATASET_UPLOADED", {"rows": rows_processed})
        logger.info(f"Dataset processing complete: {rows_processed} rows ingested.")
        
    except Exception as e:
        logger.error(f"Error processing dataset: {e}")
        await db.rollback()


@router.post("/dataset")
async def upload_dataset(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...), 
    db: AsyncSession = Depends(get_db)
):
    """
    Endpoint for uploading the Kaggle Pharmacy Inventory Dataset.
    Processes the file in the background so the UI doesn't hang.
    """
    if not file.filename.endswith(('.csv', '.xlsx')):
        raise HTTPException(status_code=400, detail="Only CSV and XLSX files are supported")
        
    content = await file.read()
    
    # Audit log the upload event
    audit_entry = AuditLedger.create_entry(
        action="DATASET_UPLOAD_STARTED", 
        user_id="ADMIN_USER",
        payload={"filename": file.filename, "size_bytes": len(content)}
    )
    db.add(audit_entry)
    await db.commit()

    # Pass to background worker
    background_tasks.add_task(process_dataset_background, content, file.filename, db)
    
    return {
        "status": "processing",
        "message": f"Dataset '{file.filename}' is being processed in the background.",
        "audit_id": audit_entry.id
    }

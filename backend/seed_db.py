import os
import sys
import random
import pandas as pd
import asyncio
from datetime import datetime
from sqlalchemy import text, select, func

# Pharmacy-scale: 1–2 CR inventory value, 60k–80k units, 700–900 critical (realistic chain pharmacy)
TARGET_TOTAL_UNITS_MIN, TARGET_TOTAL_UNITS_MAX = 60_000, 80_000
TARGET_CRITICAL_MIN, TARGET_CRITICAL_MAX = 700, 900
TARGET_VALUE_CR_MIN, TARGET_VALUE_CR_MAX = 1.0, 2.0  # in crores (1 CR = 1e7 INR)
# Purchase/sell from CSV, clamped so total inventory value lands in 1–2 CR
PURCHASE_PRICE_MIN, PURCHASE_PRICE_MAX = 80.0, 380.0
SELL_PRICE_MIN, SELL_PRICE_MAX = 100.0, 450.0
# Quantity per batch: larger so total units 60k–80k across ~500–600 batches
QUANTITY_MIN, QUANTITY_MAX = 70, 220

# Setup paths to import from backend
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from backend.database import AsyncSessionLocal, engine, Base
from backend.models.inventory import Supplier, Drug, StockBatch, SalesLog
from backend.models.clinical import Patient, Doctor, Prescription, Insurance
from backend.models.audit import AuditLedger
from backend.models.security import VerifiedBatch
from datetime import timedelta

DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'Database')

def parse_date(d_str):
    try:
        if len(str(d_str).split("/")) == 2:
            return datetime.strptime(str(d_str), "%m/%y").date()
    except:
        pass
    try:
        return datetime.strptime(str(d_str), "%m/%d/%Y").date()
    except:
        return datetime.today().date()

async def seed_data():
    async with engine.begin() as conn:
        print("Creating Tables...")
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        try:
            print("Clearing old data...")
            await db.execute(text("DELETE FROM prescriptions"))
            await db.execute(text("DELETE FROM stock_batches"))
            await db.execute(text("DELETE FROM sales_logs"))
            await db.execute(text("DELETE FROM drugs"))
            await db.execute(text("DELETE FROM suppliers"))
            await db.execute(text("DELETE FROM patients"))
            await db.execute(text("DELETE FROM doctors"))
            await db.execute(text("DELETE FROM audit_ledger"))
            await db.execute(text("DELETE FROM alerts"))
            await db.execute(text("DELETE FROM verified_batches"))
            await db.execute(text("DELETE FROM insurance"))
            await db.commit()

            print("Seeding Suppliers...")
            suppliers_df = pd.read_csv(os.path.join(DB_PATH, "SUPPLIER.csv"))
            for _, row in suppliers_df.iterrows():
                name = str(row["name"])
                supplier = Supplier(
                    id=int(row["supID"]),
                    name=name,
                    address=str(row.get("address", "N/A")),
                    phone=str(row.get("phone", "000")),
                    email=str(row.get("email", f"supplier{row['supID']}@example.com"))
                )
                db.add(supplier)
            await db.commit()

            print("Seeding Drugs & Stock Batches (1–2 CR value, 60k–80k units, 700–900 critical)...")
            drugs_df = pd.read_csv(os.path.join(DB_PATH, "DRUGS.csv"))
            random.seed(42)
            today = datetime.today().date()

            # Targets (real-time relative to today)
            target_total_units = random.randint(TARGET_TOTAL_UNITS_MIN, TARGET_TOTAL_UNITS_MAX)
            target_critical = random.randint(TARGET_CRITICAL_MIN, TARGET_CRITICAL_MAX)
            target_value_inr = random.uniform(TARGET_VALUE_CR_MIN, TARGET_VALUE_CR_MAX) * 1e7  # 1–2 CR in INR

            n_rows = len(drugs_df)
            # Number of batches we'll use for "critical" (exp in 0–30 days) so their total qty = target_critical
            n_critical_batches = max(10, min(25, target_critical // 45))
            critical_qty_per_batch = target_critical // n_critical_batches
            critical_remainder = target_critical % n_critical_batches

            # Shuffle so critical/approaching/safe are spread across drugs
            indices = list(range(n_rows))
            random.shuffle(indices)

            seen_ndcs = set()
            batch_index = 0
            non_critical_units_needed = target_total_units - target_critical
            n_non_critical = n_rows - n_critical_batches
            # Quantity per non-critical batch: keep total in 60k–80k (no overshoot)
            avg_non_critical_qty = max(40, non_critical_units_needed // n_non_critical) if n_non_critical else 0
            spread = min(35, avg_non_critical_qty // 2)
            qty_lo = max(40, avg_non_critical_qty - spread)
            qty_hi = min(220, avg_non_critical_qty + spread)

            for i in indices:
                row = drugs_df.iloc[i]
                ndc = str(row["NDC"])
                raw_purchase = float(row.get("purchasePrice", 50.0))
                raw_sell = float(row.get("sellPrice", 70.0))
                purchase_price = round(max(PURCHASE_PRICE_MIN, min(PURCHASE_PRICE_MAX, raw_purchase)), 2)
                sell_price = round(max(SELL_PRICE_MIN, min(SELL_PRICE_MAX, raw_sell)), 2)
                if ndc not in seen_ndcs:
                    generic = str(row["genericName"])
                    drug = Drug(
                        ndc=ndc,
                        brand_name=str(row["brandName"]),
                        generic_name=generic,
                        dosage=str(row["dosage"]),
                        category=(generic.split()[0] if generic else "General"),
                        purchase_price=purchase_price,
                        sell_price=sell_price,
                        sup_id=int(row["supID"])
                    )
                    db.add(drug)
                    seen_ndcs.add(ndc)

                # Assign exp_date and quantity so FEFO yields: critical ≈ target_critical, total ≈ target_total_units
                if batch_index < n_critical_batches:
                    # Critical: exp within next 30 days (FEFO will set status CRITICAL)
                    days_ahead = random.randint(1, 28)
                    exp_date = today + timedelta(days=days_ahead)
                    qty = critical_qty_per_batch + (1 if batch_index < critical_remainder else 0)
                else:
                    # Safe or approaching: exp 31–90 (approaching) or 91–365 (safe)
                    if random.random() < 0.5:
                        days_ahead = random.randint(31, 90)
                    else:
                        days_ahead = random.randint(91, 365)
                    exp_date = today + timedelta(days=days_ahead)
                    qty = random.randint(qty_lo, qty_hi)

                batch = StockBatch(
                    drug_ndc=ndc,
                    batch_id=f"B-{batch_index}-{ndc}",
                    quantity=int(qty),
                    exp_date=exp_date,
                    location="Main Warehouse"
                )
                db.add(batch)
                batch_index += 1

            await db.commit()

            # Scale drug purchase_price so inventory value (safe+approaching) lands in 1–2 CR after FEFO
            # FEFO runs in run_models(); value is sum(quantity*price) for SAFE+APPROACHING only
            async with AsyncSessionLocal() as db2:
                from backend.services.fefo_engine import run_fefo_analysis
                from backend.models.inventory import BatchStatus
                await run_fefo_analysis(db2)
                result = await db2.execute(
                    select(func.sum(StockBatch.quantity * Drug.purchase_price))
                    .select_from(StockBatch)
                    .join(Drug, StockBatch.drug_ndc == Drug.ndc)
                    .where(StockBatch.status.in_([BatchStatus.SAFE, BatchStatus.APPROACHING_EXPIRY]))
                )
                current_value = result.scalar() or 0.0
                if current_value > 0 and abs(current_value - target_value_inr) > 0.01 * target_value_inr:
                    factor = target_value_inr / current_value
                    for drug in (await db2.execute(select(Drug))).scalars().all():
                        drug.purchase_price = round(drug.purchase_price * factor, 2)
                        drug.sell_price = round(drug.sell_price * factor, 2)
                    await db2.commit()

            print(f"   → Seeded {len(seen_ndcs)} drugs, {n_rows} batches. Targets: ~{target_total_units} units, ~{target_critical} critical, value ~{target_value_inr/1e7:.2f} CR (FEFO applied).")

            print("Seeding manufacturer-verified batches for Fake Medicine Detection System...")
            verified_path = os.path.join(DB_PATH, "VERIFIED_BATCHES.csv")
            if os.path.exists(verified_path):
                verified_df = pd.read_csv(verified_path)
                for _, row in verified_df.iterrows():
                    vb = VerifiedBatch(
                        ndc=str(row.get("NDC")),
                        batch_id=str(row.get("batch_id")),
                        manufacturer_name=str(row.get("manufacturer_name", "")),
                        valid_from=pd.to_datetime(row.get("valid_from")).date()
                        if not pd.isna(row.get("valid_from"))
                        else None,
                        valid_to=pd.to_datetime(row.get("valid_to")).date()
                        if not pd.isna(row.get("valid_to"))
                        else None,
                        notes=str(row.get("notes", "")) or None,
                    )
                    db.add(vb)
                await db.commit()

            print("Seeding Patients...")
            try:
                patients_df = pd.read_csv(os.path.join(DB_PATH, "PATIENT1(1).csv"))
                for _, row in patients_df.iterrows():
                    raw_insurance = row.get("insurance", None)
                    # Treat empty strings / NaN as no insurance so stats stay realistic
                    if raw_insurance is None or (isinstance(raw_insurance, float) and pd.isna(raw_insurance)) or str(raw_insurance).strip() == "":
                        insurance_value = None
                    else:
                        insurance_value = str(raw_insurance).strip()

                    patient = Patient(
                        id=int(row["patientID"]),
                        first_name=str(row["firstName"]),
                        last_name=str(row["lastName"]),
                        birthdate=parse_date(row.get("birthdate", "01/01/1980")),
                        gender=str(row.get("gender", "U")),
                        address=str(row.get("address", "")),
                        phone=str(row.get("phone", "")),
                        insurance=insurance_value,
                    )
                    db.add(patient)
                await db.commit()
            except Exception as e:
                print("Patients CSV missing, skipping...", e)

            print("Seeding Doctors...")
            try:
                doctors_df = pd.read_csv(os.path.join(DB_PATH, "DOCTOR1(1).csv"))
                for _, row in doctors_df.iterrows():
                    doc = Doctor(
                        id=int(row["physID"]),
                        name=str(row["name"]),
                        address=str(row.get("address", "")),
                        phone=str(row.get("phone", ""))
                    )
                    db.add(doc)
                await db.commit()
            except Exception:
                print("Doctors CSV missing, skipping...")

            print("Seeding Insurance providers...")
            try:
                insurance_path = os.path.join(DB_PATH, "INSURANCE.csv")
                if os.path.exists(insurance_path):
                    insurance_df = pd.read_csv(insurance_path)
                    for _, row in insurance_df.iterrows():
                        ins = Insurance(
                            name=str(row.get("name", "")).strip(),
                            phone=str(row.get("phone", "")),
                            co_pay=str(row.get("coPay", "")),
                        )
                        db.add(ins)
                    await db.commit()
            except Exception as e:
                print("Insurance CSV missing or error, skipping...", e)

            print("Seeding Prescriptions and Sales Logs for AI demand...")
            try:
                rx_df = pd.read_csv(os.path.join(DB_PATH, "PRESCRIPTIONS.csv"))
                today = datetime.today().date()
                for _, row in rx_df.iterrows():
                    # Spread historical prescriptions across the last 180 days
                    days_ago = random.randint(0, 180)
                    issued_date = today - timedelta(days=days_ago)
                    qty = int(row.get("qty", 30))
                    ndc = str(row["NDC"])

                    rx = Prescription(
                        patient_id=int(row["patientID"]),
                        doctor_id=int(row["physID"]),
                        drug_ndc=ndc,
                        quantity=qty,
                        days_supply=int(row.get("days", 30)),
                        refills_remaining=int(row.get("refills", 0)),
                        status="filled",
                        issued_date=issued_date
                    )
                    db.add(rx)

                    # Mirror into SalesLog so /reports/sales-trends and Prophet have real time-series data
                    sale = SalesLog(
                        drug_ndc=ndc,
                        quantity=qty,
                        sale_date=issued_date
                    )
                    db.add(sale)

                await db.commit()
            except Exception as e:
                print("Prescriptions CSV missing, skipping...", e)
                
            print("Data ingestion complete!")

        except Exception as e:
            print(f"Error seeding DB: {e}")
            await db.rollback()


async def run_models():
    print("Training ML Models...")
    from backend.services.demand_forecasting import generate_forecast
    from backend.services.fefo_engine import run_fefo_analysis

    async with AsyncSessionLocal() as db:
        print("1. Running FEFO analysis to label critical/expired batches...")
        await run_fefo_analysis(db)
        print("2. Forecasting Prophet Demand...")
        try:
            await generate_forecast("ALL_DRUGS", db)
        except Exception as e:
            print(f"Prophet Demand mapping partial trace skipped during seeding: {e}")
        print("Machine Learning components successfully loaded real data!")


async def main():
    await seed_data()
    await run_models()


if __name__ == "__main__":
    asyncio.run(main())

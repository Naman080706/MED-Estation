from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List

from ..database import get_db
from ..models.clinical import Patient
from ..schemas.clinical import PatientResponse, PatientCreate

router = APIRouter()


@router.get("/", response_model=List[PatientResponse])
async def list_patients(db: AsyncSession = Depends(get_db)):
    """Return all patients in the registry."""
    result = await db.execute(select(Patient).order_by(Patient.last_name, Patient.first_name))
    return result.scalars().all()


@router.get("/stats")
async def patient_stats(db: AsyncSession = Depends(get_db)):
    """Aggregate stats used by the dashboard Patients & Insurance widget."""
    total_q = await db.execute(select(func.count()).select_from(Patient))
    total = total_q.scalar() or 0

    insured_q = await db.execute(
        select(func.count()).select_from(Patient).where(
            Patient.insurance.is_not(None),
            Patient.insurance != "",
        )
    )
    insured = insured_q.scalar() or 0

    return {
        "total_patients": total,
        "insured_patients": insured,
        "uninsured_patients": max(total - insured, 0),
    }


@router.get("/{patient_id}", response_model=PatientResponse)
async def get_patient(patient_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Patient).where(Patient.id == patient_id))
    patient = result.scalar_one_or_none()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient


@router.post("/", response_model=PatientResponse)
async def create_patient(payload: PatientCreate, db: AsyncSession = Depends(get_db)):
    patient = Patient(**payload.model_dump())
    db.add(patient)
    await db.commit()
    await db.refresh(patient)
    return patient


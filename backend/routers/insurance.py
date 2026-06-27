from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ..database import get_db
from ..models.clinical import Insurance

router = APIRouter()


@router.get("/")
async def list_insurance(db: AsyncSession = Depends(get_db)):
    """Return all insurance providers from the registry (e.g. seeded from INSURANCE.csv)."""
    result = await db.execute(select(Insurance).order_by(Insurance.name))
    rows = result.scalars().all()
    return [
        {"id": r.id, "name": r.name, "phone": r.phone or "", "co_pay": r.co_pay or ""}
        for r in rows
    ]

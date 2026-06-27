from typing import List

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models.inventory import Drug, StockBatch, Supplier
from ..models.clinical import Patient
from ..schemas.inventory import SearchResult

router = APIRouter()


@router.get("/", response_model=List[SearchResult])
async def global_search(
    q: str = Query(..., min_length=1, description="Free-text search term"),
    limit: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
):
    """
    Global search across the pharmacy dataset.

    - Drugs: NDC, brand name, generic name.
    - Batches: batch ID, linked NDC.
    - Suppliers: supplier name and email.
    """
    term = f"%{q}%"

    results: List[SearchResult] = []

    # 1) Drugs
    drug_result = await db.execute(
        select(Drug).where(
            (Drug.ndc.ilike(term))
            | (Drug.brand_name.ilike(term))
            | (Drug.generic_name.ilike(term))
        ).limit(limit)
    )
    for drug in drug_result.scalars().all():
        results.append(
            SearchResult(
                entity_type="drug",
                id=drug.ndc,
                title=drug.brand_name or drug.generic_name or drug.ndc,
                subtitle=f"{drug.generic_name} · {drug.dosage}"
                if drug.generic_name
                else drug.dosage,
            )
        )

    if len(results) >= limit:
        return results[:limit]

    # 2) Batches (joined with drug for context)
    batch_result = await db.execute(
        select(StockBatch, Drug)
        .join(Drug, StockBatch.drug_ndc == Drug.ndc)
        .where(
            (StockBatch.batch_id.ilike(term))
            | (StockBatch.drug_ndc.ilike(term))
        )
        .limit(limit)
    )
    for batch, drug in batch_result.all():
        if len(results) >= limit:
            break
        results.append(
            SearchResult(
                entity_type="batch",
                id=str(batch.id),
                title=f"Batch {batch.batch_id}",
                subtitle=f"{drug.brand_name} ({drug.ndc}) · {batch.quantity} units",
            )
        )

    if len(results) >= limit:
        return results[:limit]

    # 3) Suppliers
    supplier_result = await db.execute(
        select(Supplier).where(
            (Supplier.name.ilike(term)) | (Supplier.email.ilike(term))
        ).limit(limit)
    )
    for supplier in supplier_result.scalars().all():
        if len(results) >= limit:
            break
        results.append(
            SearchResult(
                entity_type="supplier",
                id=str(supplier.id),
                title=supplier.name,
                subtitle=supplier.email,
            )
        )

    if len(results) >= limit:
        return results[:limit]

    # 4) Patients (for patient/insurance search)
    patient_result = await db.execute(
        select(Patient).where(
            (Patient.first_name.ilike(term))
            | (Patient.last_name.ilike(term))
            | (Patient.phone.ilike(term))
            | (Patient.insurance.ilike(term))
        ).limit(limit)
    )
    for p in patient_result.scalars().all():
        if len(results) >= limit:
            break
        full_name = f"{p.first_name} {p.last_name}".strip()
        subtitle_parts = [p.phone or ""]
        if p.insurance:
            subtitle_parts.append(f"Insurance: {p.insurance}")
        results.append(
            SearchResult(
                entity_type="patient",
                id=str(p.id),
                title=full_name or f"Patient #{p.id}",
                subtitle=" · ".join([s for s in subtitle_parts if s]),
            )
        )

    return results[:limit]


from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import date, datetime
from ..models.clinical import PrescriptionStatus

class PatientBase(BaseModel):
    first_name: str
    last_name: str
    birthdate: date
    address: str
    phone: Optional[str] = None
    gender: str
    insurance: Optional[str] = None


class PatientCreate(PatientBase):
    pass


class PatientResponse(PatientBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

class DoctorBase(BaseModel):
    name: str
    address: str
    phone: str
    specialization: Optional[str] = None

class DoctorResponse(DoctorBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

class PrescriptionBase(BaseModel):
    patient_id: int
    doctor_id: int
    drug_ndc: str
    quantity: int
    days_supply: int
    refills_remaining: int
    status: PrescriptionStatus = PrescriptionStatus.PENDING
    issued_date: date

class PrescriptionCreate(PrescriptionBase):
    pass

class PrescriptionUpdateStatus(BaseModel):
    status: PrescriptionStatus

class PrescriptionResponse(PrescriptionBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

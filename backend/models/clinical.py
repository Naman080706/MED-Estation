from sqlalchemy import Column, Integer, String, Date, ForeignKey, Enum
from sqlalchemy.orm import relationship
import enum
from ..database import Base

class PrescriptionStatus(str, enum.Enum):
    PENDING = "pending"
    FILLED = "filled"
    PICKED_UP = "picked up"
    CANCELLED = "cancelled"

class Patient(Base):
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True, index=True) # From patientID
    first_name = Column(String)
    last_name = Column(String)
    birthdate = Column(Date)
    address = Column(String)
    phone = Column(String)
    gender = Column(String)
    insurance = Column(String)
    
    # Relationships
    prescriptions = relationship("Prescription", back_populates="patient")

class Doctor(Base):
    __tablename__ = "doctors"

    id = Column(Integer, primary_key=True, index=True) # From physID
    name = Column(String)
    address = Column(String)
    phone = Column(String)
    specialization = Column(String)
    
    # Relationships
    prescriptions = relationship("Prescription", back_populates="doctor")

class Insurance(Base):
    __tablename__ = "insurance"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String, nullable=False, index=True)
    phone = Column(String)
    co_pay = Column(String)


class Prescription(Base):
    __tablename__ = "prescriptions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    patient_id = Column(Integer, ForeignKey("patients.id"))
    doctor_id = Column(Integer, ForeignKey("doctors.id"))
    drug_ndc = Column(String, ForeignKey("drugs.ndc"))
    quantity = Column(Integer)
    days_supply = Column(Integer)
    refills_remaining = Column(Integer)
    status = Column(Enum(PrescriptionStatus), default=PrescriptionStatus.PENDING, index=True)
    issued_date = Column(Date, index=True)
    
    # Relationships
    patient = relationship("Patient", back_populates="prescriptions")
    doctor = relationship("Doctor", back_populates="prescriptions")

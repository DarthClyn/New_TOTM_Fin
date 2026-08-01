"""
Pydantic Schemas for Data Validation (schemas.py)
Defines request and response validation schemas for interacting with ORM models.
"""

from typing import Optional
from datetime import datetime
from pydantic import BaseModel

class InvoiceAuditRecordCreate(BaseModel):
    entity: str
    db_target: str
    doc_no: str
    vendor_code: Optional[str] = None
    company: str
    date: str
    amount: float
    tax: float
    net_amount: float
    match_type: str
    status: str

class InvoiceAuditRecordResponse(InvoiceAuditRecordCreate):
    id: int
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True  # Pydantic v2 compatible ORM reader flag

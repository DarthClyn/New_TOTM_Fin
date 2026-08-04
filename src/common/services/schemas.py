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

class EmployeeClaimRecordCreate(BaseModel):
    ref_no: str
    employee_code: Optional[str] = None
    employee_name: Optional[str] = None
    submit_date: Optional[str] = None
    approved_date: Optional[str] = None
    group_code: Optional[str] = None
    group_name: str
    template_name: Optional[str] = None
    receipt_no: Optional[str] = None
    receipt_date: Optional[str] = None
    approver: Optional[str] = None
    gst: Optional[float] = 0.0
    claimable_amt: float
    hod_approval: str
    policy_decision: Optional[str] = None
    reasoning: Optional[str] = None
    gl_code: str
    target_system: Optional[str] = None
    status: str

class EmployeeClaimRecordResponse(EmployeeClaimRecordCreate):
    id: int
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

"""
ORM Table Definitions (models.py)
Defines database tables as Python classes inheriting from Base.
"""

from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime
from database import Base

class InvoiceAuditRecord(Base):
    __tablename__ = "supplier_invoices"

    id = Column(Integer, primary_key=True, index=True)
    entity = Column(String(50), nullable=False)            # TLPL, TTS, IBPL
    db_target = Column(String(50), nullable=False)         # TTSPL_SQL_DB, IBPL_SQL_DB
    doc_no = Column(String(100), nullable=False)           # INV-2026-8891
    vendor_code = Column(String(100), nullable=True)        # 3000/AEROS
    company = Column(String(200), nullable=False)          # AEROSPACE SYSTEMS LTD
    date = Column(String(50), nullable=False)             # 2026-05-15
    amount = Column(Float, nullable=False)                 # 1635.00
    tax = Column(Float, nullable=False)                    # 135.00
    net_amount = Column(Float, nullable=False)             # 1500.00
    match_type = Column(String(50), nullable=False)         # 4_WAY_MATCH, 3_WAY_MATCH, 2_WAY_MATCH
    status = Column(String(50), nullable=False)             # SQL_RECORD_INSERTED, POSTED_TO_SAP, MANUALLY_APPROVED, REJECTED_BY_HUMAN
    created_at = Column(DateTime, default=datetime.utcnow)

class EmployeeClaimRecord(Base):
    __tablename__ = 'employee_claims'
    id = Column(Integer, primary_key=True, index=True)
    ref_no = Column(String(50), nullable=False)
    gl_code = Column(String(50), nullable=False)
    group_name = Column(String(100), nullable=False)
    receipt_no = Column(String(100), nullable=True)
    receipt_date = Column(String(50), nullable=True)
    claimable_amt = Column(Float, nullable=False)
    hod_approval = Column(String(50), nullable=False)
    status = Column(String(50), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

"""
Stage 4: SQL Database Commit & SQLAlchemy ORM Integration Module
Integrates database.py, models.py, and schemas.py to store audited supplier invoices in local_sql_accounting.db.
"""

import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../common/services')))

from datetime import datetime
from database import engine, SessionLocal, Base
from models import InvoiceAuditRecord
from schemas import InvoiceAuditRecordCreate, InvoiceAuditRecordResponse

# Initialize database tables
Base.metadata.create_all(bind=engine)

class Stage4Database:
    """Stage 4 Database Manager using SQLAlchemy ORM"""

    @classmethod
    def push_invoice_record(cls, record_dict: dict) -> dict:
        # Validate input using Pydantic schema
        schema_data = InvoiceAuditRecordCreate(**record_dict)
        db = SessionLocal()
        try:
            record = InvoiceAuditRecord(
                entity=schema_data.entity,
                db_target=schema_data.db_target,
                doc_no=schema_data.doc_no,
                vendor_code=schema_data.vendor_code,
                company=schema_data.company,
                date=schema_data.date,
                amount=schema_data.amount,
                tax=schema_data.tax,
                net_amount=schema_data.net_amount,
                match_type=schema_data.match_type,
                status=schema_data.status
            )
            db.add(record)
            db.commit()
            db.refresh(record)
            
            response_obj = InvoiceAuditRecordResponse.model_validate(record)
            return {"status": "success", "data": response_obj.model_dump()}
        except Exception as e:
            db.rollback()
            return {"status": "error", "message": str(e)}
        finally:
            db.close()

    @classmethod
    def get_all_records(cls):
        db = SessionLocal()
        try:
            records = db.query(InvoiceAuditRecord).order_by(InvoiceAuditRecord.id.desc()).all()
            return [InvoiceAuditRecordResponse.model_validate(r).model_dump() for r in records]
        finally:
            db.close()

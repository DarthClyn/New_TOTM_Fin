"""
Stage 4: SQL Database Commit & SQLAlchemy ORM Integration Module for Process 2
Integrates database.py, models.py, and schemas.py to store approved employee claims.
"""

import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../common/services')))

from datetime import datetime
from database import engine, SessionLocal, Base
from models import EmployeeClaimRecord
from schemas import EmployeeClaimRecordCreate, EmployeeClaimRecordResponse

# Initialize database tables
Base.metadata.create_all(bind=engine)

class Stage4DatabaseProcess2:
    """Stage 4 Database Manager for Claims using SQLAlchemy ORM"""

    @classmethod
    def push_claim_record(cls, record_dict: dict) -> dict:
        # Validate input using Pydantic schema
        schema_data = EmployeeClaimRecordCreate(**record_dict)
        db = SessionLocal()
        try:
            record = EmployeeClaimRecord(
                ref_no=schema_data.ref_no,
                gl_code=schema_data.gl_code,
                group_name=schema_data.group_name,
                receipt_no=schema_data.receipt_no,
                receipt_date=schema_data.receipt_date,
                claimable_amt=schema_data.claimable_amt,
                hod_approval=schema_data.hod_approval,
                status=schema_data.status
            )
            db.add(record)
            db.commit()
            db.refresh(record)
            
            response_obj = EmployeeClaimRecordResponse.model_validate(record)
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
            records = db.query(EmployeeClaimRecord).order_by(EmployeeClaimRecord.id.desc()).all()
            return [EmployeeClaimRecordResponse.model_validate(r).model_dump() for r in records]
        finally:
            db.close()

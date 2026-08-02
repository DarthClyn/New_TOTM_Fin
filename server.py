"""
Unified HTTP & API Server for Finance Automation Hub (server.py)
Serves static web assets and provides SQLite/SQLAlchemy REST API endpoints for Stage 4 DB.
"""

import sys
import os
import json
from http.server import HTTPServer, SimpleHTTPRequestHandler

# Add common/services directory to sys.path
SERVICES_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "src", "common", "services")
if SERVICES_DIR not in sys.path:
    sys.path.insert(0, SERVICES_DIR)

try:
    from src.common.services.database import engine, SessionLocal, Base
    from src.common.services.models import InvoiceAuditRecord, EmployeeClaimRecord
    from src.common.services.schemas import (
        InvoiceAuditRecordCreate, InvoiceAuditRecordResponse,
        EmployeeClaimRecordCreate, EmployeeClaimRecordResponse
    )
except ImportError:
    from database import engine, SessionLocal, Base
    from models import InvoiceAuditRecord, EmployeeClaimRecord
    from schemas import (
        InvoiceAuditRecordCreate, InvoiceAuditRecordResponse,
        EmployeeClaimRecordCreate, EmployeeClaimRecordResponse
    )

# Create database tables automatically if they don't exist
Base.metadata.create_all(bind=engine)

class CustomFinanceHandler(SimpleHTTPRequestHandler):
    def send_json_response(self, data, status_code=200):
        body = json.dumps(data, default=str).encode('utf-8')
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_GET(self):
        path = self.path.split('?')[0]
        
        # API Route: Process 1 Supplier Invoices
        if path == '/api/p1/records':
            db = SessionLocal()
            try:
                records = db.query(InvoiceAuditRecord).order_by(InvoiceAuditRecord.id.desc()).all()
                result = [InvoiceAuditRecordResponse.model_validate(r).model_dump() for r in records]
                self.send_json_response(result)
            except Exception as e:
                self.send_json_response({"error": str(e)}, status_code=500)
            finally:
                db.close()
            return

        # API Route: Process 2 Employee Claims
        elif path == '/api/p2/records':
            db = SessionLocal()
            try:
                records = db.query(EmployeeClaimRecord).order_by(EmployeeClaimRecord.id.desc()).all()
                result = [EmployeeClaimRecordResponse.model_validate(r).model_dump() for r in records]
                self.send_json_response(result)
            except Exception as e:
                self.send_json_response({"error": str(e)}, status_code=500)
            finally:
                db.close()
            return

        # Fallback to static file serving
        return super().do_GET()

    def do_POST(self):
        path = self.path.split('?')[0]
        content_length = int(self.headers.get('Content-Length', 0))
        post_data = self.rfile.read(content_length)
        
        try:
            payload = json.loads(post_data.decode('utf-8'))
        except Exception:
            self.send_json_response({"error": "Invalid JSON body"}, status_code=400)
            return

        if path == '/api/p1/records':
            db = SessionLocal()
            try:
                validated = InvoiceAuditRecordCreate(**payload)
                record = InvoiceAuditRecord(
                    entity=validated.entity,
                    db_target=validated.db_target,
                    doc_no=validated.doc_no,
                    vendor_code=validated.vendor_code,
                    company=validated.company,
                    date=validated.date,
                    amount=validated.amount,
                    tax=validated.tax,
                    net_amount=validated.net_amount,
                    match_type=validated.match_type,
                    status=validated.status
                )
                db.add(record)
                db.commit()
                db.refresh(record)
                res = InvoiceAuditRecordResponse.model_validate(record).model_dump()
                self.send_json_response(res, status_code=201)
            except Exception as e:
                db.rollback()
                self.send_json_response({"error": str(e)}, status_code=400)
            finally:
                db.close()
            return

        elif path == '/api/p2/records':
            db = SessionLocal()
            try:
                validated = EmployeeClaimRecordCreate(**payload)
                record = EmployeeClaimRecord(
                    ref_no=validated.ref_no,
                    gl_code=validated.gl_code,
                    group_name=validated.group_name,
                    receipt_no=validated.receipt_no,
                    receipt_date=validated.receipt_date,
                    claimable_amt=validated.claimable_amt,
                    hod_approval=validated.hod_approval,
                    employee_name=validated.employee_name,
                    status=validated.status
                )
                db.add(record)
                db.commit()
                db.refresh(record)
                res = EmployeeClaimRecordResponse.model_validate(record).model_dump()
                self.send_json_response(res, status_code=201)
            except Exception as e:
                db.rollback()
                self.send_json_response({"error": str(e)}, status_code=400)
            finally:
                db.close()
            return

        self.send_json_response({"error": "Not Found"}, status_code=404)

    def do_DELETE(self):
        path = self.path.split('?')[0]
        
        if path == '/api/p1/records':
            db = SessionLocal()
            try:
                db.query(InvoiceAuditRecord).delete()
                db.commit()
                self.send_json_response({"status": "success", "message": "All supplier invoice records cleared"})
            except Exception as e:
                db.rollback()
                self.send_json_response({"error": str(e)}, status_code=500)
            finally:
                db.close()
            return

        elif path == '/api/p2/records':
            db = SessionLocal()
            try:
                db.query(EmployeeClaimRecord).delete()
                db.commit()
                self.send_json_response({"status": "success", "message": "All employee claim records cleared"})
            except Exception as e:
                db.rollback()
                self.send_json_response({"error": str(e)}, status_code=500)
            finally:
                db.close()
            return

        self.send_json_response({"error": "Not Found"}, status_code=404)

def run(port=3000):
    server_address = ('', port)
    httpd = HTTPServer(server_address, CustomFinanceHandler)
    print(f"Finance Automation Server running at http://localhost:{port}/")
    print(f"Connected to SQLite Database: {os.path.join(SERVICES_DIR, 'local_sql_accounting.db')}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")

if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else int(os.getenv("PORT", 3000))
    run(port)

# Finance Automation Pipeline

This project is a complete, automated end-to-end finance processing application. It leverages modern web technologies, Cloud Storage (OneDrive), Optical Character Recognition (OCR), and Large Language Models (LLMs) to automate tedious manual data entry, cross-referencing, and verification tasks. 

The application is split into two primary workflows: **Process 1 (Supplier Invoice Matching)** and **Process 2 (Employee Claims Processing)**.

---

## 🏭 Process 1: Supplier Invoice Matching (3-Way / 4-Way Match)

Process 1 handles the complex task of ingesting an unstructured vendor invoice (PDF or Image), reading the contents, and mathematically/logically verifying it against supporting documents (Purchase Orders, Delivery Orders, Service Agreements).

### 1. Document Selection & Integration
- **Hybrid Cloud Integration**: Connects directly to Microsoft OneDrive allowing users to select single invoices or entire folders of supporting context documents natively.
- **Local Fallback**: Full support for drag-and-drop local file uploads.

### 2. OCR + AI Extraction
- **Optical Character Recognition (OCR)**: Uses `Tesseract.js` and `PDF.js` to physically read text from flat images (PNG/JPG) and scanned PDFs.
- **AI Structuring**: An LLM parses the messy OCR text block and structures it into clean, reliable JSON data (Vendor Name, Invoice Number, Line Items, Total Amounts).

### 3. AI Mapping, Reasoning & Verification (2-Step AI)
- **Document Mapping**: The AI cross-references the extracted invoice against the supporting documents (e.g., verifying that the Invoice Amount matches the Purchase Order Amount).
- **Reasoning & Flagging**: Uses a strict 2-step AI reasoning prompt to logically verify if the invoice is valid. If there are discrepancies (e.g., missing items, price mismatch), the AI automatically flags the specific fields and provides a human-readable explanation.

### 4. Automated Database Entry
- **Human-in-the-Loop Validation**: If the AI flags discrepancies, the automated pipeline pauses and requires a human auditor to review and manually approve the fields.
- **Auto-Push**: Once all discrepancies are resolved (or if the AI found a perfect match initially), the pipeline automatically pushes the verified data into the SQL Database.

---

## 💼 Process 2: Employee Claims Processing

Process 2 streamlines internal employee expense claims. It replaces manual audits with an AI system that knows the company policy and accounting structure.

### 1. AI Policy Verification
- **Automated Auditing**: The AI acts as a strict auditor, reading the claim (e.g., "Dinner with client - $250") and checking it against hardcoded company policies (e.g., "Meals cannot exceed $100 per head").
- **Flagging**: Violations are instantly flagged (e.g., "Policy Violation: Over limit") and marked for human review. Compliant claims pass straight through.

### 2. AI GL (General Ledger) Code Mapping
- **Semantic Mapping**: Instead of requiring employees to know complex accounting codes, the AI analyzes the claim description and intelligently maps it to the correct GL Code (e.g., "Lunch" automatically maps to `78050200` [MEAL & ENTERTAINMENT - BUSINESS]).
- **Fallback Mechanism**: If the AI cannot confidently map a claim, it flags the row as `Human Required`, allowing the finance team to manually select the correct GL code before proceeding.

### 3. Automated DB Entry
- **Seamless Export**: Verified, policy-compliant, and fully-coded claims are automatically pushed into the SQL table, ready for the payroll/finance team to reimburse.

---


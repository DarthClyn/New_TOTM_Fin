"""
Stage 3: AI Multi-Way Matcher Python Module
Matches extracted invoice data against supporting documents (AGR, DO, PO) using AI rules.
"""

import json
import requests
from typing import Dict, Any

class Stage3AiMatcher:
    """Stage 3 AI Matching Engine"""

    FIXED_MODEL = "nvidia/nemotron-3-super-120b-a12b:free"
    SYSTEM_PROMPT = (
        "You are an expert Enterprise Audit & Invoice Matching AI.\n"
        "Your task is to perform a strict 2-Way / 3-Way / 4-Way match between extracted Invoice Key-Values "
        "and Supporting Documents (Purchase Order, Delivery Order, Contract Agreement).\n\n"
        "STRICT VERIFICATION RULES:\n"
        "1. KEY & SYNONYM MAPPING: Recognize field synonyms (e.g. 'Total Amount' vs 'Approved Amount', 'Vendor' vs 'Seller').\n"
        "2. SPELLING & VENDOR VERIFICATION: Check vendor names, line items, and references for exact spelling matches.\n"
        "3. DECIMAL ACCURACY: Compare prices, subtotals, taxes, and totals up to decimal precision.\n"
        "4. QUANTITY & DATE CHECKS: Verify ordered vs delivered vs invoiced quantities and dates.\n"
        "5. MATCH STATUS: Output status for each field as MATCHED, DISCREPANCY, PARTIAL_MATCH, or NOT_AVAILABLE.\n\n"
        "Output ONLY valid JSON."
    )

    @classmethod
    def match_documents(cls, invoice_data: Any, supporting_docs_text: str, api_key: str) -> Dict[str, Any]:
        if not api_key:
            return {"status": "error", "message": "OpenRouter API Key is required."}

        payload_text = (
            f"=== EXTRACTED INVOICE DATA ===\n{json.dumps(invoice_data, indent=2)}\n\n"
            f"=== SUPPORTING DOCUMENTS ===\n{supporting_docs_text}"
        )

        headers = {
            "Authorization": f"Bearer {api_key}",
            "HTTP-Referer": "http://localhost:8000",
            "X-Title": "Finance Automation AI Stage 3",
            "Content-Type": "application/json"
        }

        payload = {
            "model": cls.FIXED_MODEL,
            "messages": [
                {"role": "system", "content": cls.SYSTEM_PROMPT},
                {"role": "user", "content": payload_text}
            ],
            "temperature": 0.1
        }

        try:
            response = requests.post("https://openrouter.ai/api/v1/chat/completions", headers=headers, json=payload, timeout=60)
            response.raise_for_status()
            data = response.json()

            raw_content = data["choices"][0]["message"]["content"]
            clean_json = raw_content.replace("```json", "").replace("```", "").strip()

            try:
                parsed_match = json.loads(clean_json)
                return {"status": "success", "match_analysis": parsed_match}
            except json.JSONDecodeError:
                return {"status": "warning", "raw_content": raw_content}

        except Exception as e:
            return {"status": "error", "message": f"Stage 3 Matching Failure: {str(e)}"}

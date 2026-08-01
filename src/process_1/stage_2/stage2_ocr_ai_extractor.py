"""
Stage 2: OCR & OpenRouter AI Key Extractor Python Module
Performs OCR conversion and OpenRouter AI extraction using model: nvidia/nemotron-3-super-120b-a12b:free
Dynamic extraction of valid fields only (omitting missing/null fields).
"""

import os
import json
import requests
from typing import Dict, Any

class Stage2OcrAiExtractor:
    """Stage 2 OCR & AI Key Mapping Engine"""

    FIXED_MODEL = "nvidia/nemotron-3-super-120b-a12b:free"
    SYSTEM_PROMPT = (
        "You are an expert OCR Invoice Data Parser.\n"
        "Extract all key-value fields and details present in the invoice document.\n\n"
        "CRITICAL EXTRACTION RULES:\n"
        "1. EXTRACT ALL FOUND FIELDS: Extract standard fields and any additional custom fields present.\n"
        "2. DO NOT INCLUDE MISSING FIELDS: If a field is missing or not found in the text, DO NOT include it in the JSON output. Do NOT output null, 'N/A', or empty values.\n"
        "3. SYNONYM MAPPING: Map keys smartly to clean snake_case identifiers.\n"
        "4. Output ONLY valid JSON without markdown wrapping."
    )

    @classmethod
    def extract_key_values(cls, ocr_text: str, api_key: str) -> Dict[str, Any]:
        if not api_key:
            return {"status": "error", "message": "OpenRouter API Key is required."}

        user_prompt = f"This is extracted invoice text. Extract ALL valid fields present in it. Omit any missing fields:\n\n{ocr_text}"

        headers = {
            "Authorization": f"Bearer {api_key}",
            "HTTP-Referer": "http://localhost:8000",
            "X-Title": "TOTM Finance Automation Backend",
            "Content-Type": "application/json"
        }

        payload = {
            "model": cls.FIXED_MODEL,
            "messages": [
                {"role": "system", "content": cls.SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt}
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
                parsed_data = json.loads(clean_json)
                # Filter out null / N/A fields
                filtered_data = {
                    k: v for k, v in parsed_data.items()
                    if v not in [None, "N/A", "n/a", "null", ""]
                }
                return {"status": "success", "extracted_data": filtered_data, "model": cls.FIXED_MODEL}
            except json.JSONDecodeError:
                return {"status": "warning", "raw_content": raw_content}

        except Exception as e:
            return {"status": "error", "message": f"OpenRouter API Failure: {str(e)}"}

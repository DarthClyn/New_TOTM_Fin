"""
Stage 1: Document Selector Python Module
Loads default input files from directory: default_input_files_stage1/
Handles inspection and text stream loading for Images, PDFs, and Text files.
"""

import os
from typing import Dict, Any, List

class DocumentSelector:
    """Stage 1 Document Handler"""

    BASE_DIR = os.path.join(os.path.dirname(__file__), "default_input_files_stage1")

    @classmethod
    def get_scenario_files(cls, scenario_id: str) -> List[Dict[str, str]]:
        """Reads text files from default_input_files_stage1/{scenario_id}/"""
        scenario_dir = os.path.join(cls.BASE_DIR, scenario_id)
        files = []

        if os.path.exists(scenario_dir):
            for fname in sorted(os.listdir(scenario_dir)):
                if fname.endswith(".txt") or fname.endswith(".csv"):
                    fpath = os.path.join(scenario_dir, fname)
                    with open(fpath, "r", encoding="utf-8", errors="ignore") as f:
                        content = f.read()
                    files.append({
                        "filename": fname,
                        "path": fpath,
                        "content": content
                    })

        return files

    @staticmethod
    def inspect_and_load(file_bytes: bytes, filename: str) -> Dict[str, Any]:
        ext = os.path.splitext(filename)[1].lower()

        if ext in ['.png', '.jpg', '.jpeg', '.webp']:
            return {
                "stage": 1,
                "filename": filename,
                "file_type": "image",
                "requires_ocr": True,
                "direct_text": None,
                "message": "Image document loaded. Stage 2 OCR required."
            }

        elif ext in ['.txt', '.csv', '.json', '.md']:
            try:
                text_content = file_bytes.decode('utf-8').strip()
            except UnicodeDecodeError:
                text_content = file_bytes.decode('latin-1').strip()

            return {
                "stage": 1,
                "filename": filename,
                "file_type": "text",
                "requires_ocr": False,
                "direct_text": text_content,
                "message": "Text document loaded directly."
            }

        else:
            return {
                "stage": 1,
                "filename": filename,
                "file_type": "unknown",
                "requires_ocr": True,
                "direct_text": None,
                "message": f"File extension {ext} loaded."
            }

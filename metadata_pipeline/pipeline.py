import os
import json
from typing import Dict

from .step1_text import run_step1, Step1Options
from .step2_gemini import run_step2, Step2Options


def merge_step1_step2(step1: Dict, step2: Dict, file_name: str) -> Dict:
    th2 = step2.get("thesis") or {}
    uni2 = step2.get("university") or {}
    fac2 = step2.get("faculty") or {}
    sch2 = step2.get("school") or {}
    dep2 = step2.get("department") or {}
    deg2 = step2.get("degree") or {}
    lang2 = step2.get("language") or {}
    persons2 = step2.get("academic_persons") or []

    def prefer(a, b):
        return a if a not in (None, "") else b

    thesis = {
        "title_fr": th2.get("title_fr"),
        "title_en": th2.get("title_en"),
        "title_ar": th2.get("title_ar"),
        "abstract_fr": prefer(step1.get("abstract_fr"), th2.get("abstract_fr")),
        "abstract_en": prefer(step1.get("abstract_en"), th2.get("abstract_en")),
        "abstract_ar": prefer(step1.get("abstract_ar"), th2.get("abstract_ar")),
        "defense_date": th2.get("defense_date"),
        "submission_date": th2.get("submission_date"),
        "academic_year": th2.get("academic_year"),
        "page_count": th2.get("total_pages") or th2.get("page_count"),
        "thesis_number": th2.get("thesis_number"),
        "table_of_contents": step1.get("toc_items"),
        "references_count": step1.get("references_count"),
    }

    merged = {
        "file_name": file_name,
        "thesis": thesis,
        "university": uni2,
        "faculty": fac2,
        "school": sch2,
        "department": dep2,
        "degree": deg2,
        "language": lang2,
        "academic_persons": persons2,
        "categories": step2.get("categories") or [],
        "keywords": step2.get("keywords") or [],
        "scanned_pdf": bool(step1.get("scanned_pdf")),
        "has_keywords_marker": bool(step1.get("has_keywords_marker")),
    }
    return merged


async def run_pipeline(pdf_path: str, api_key: str) -> Dict:
    """Execute Step 1 (text-only) then Step 2 (Gemini) and merge results."""
    s1 = run_step1(pdf_path, Step1Options())
    if s1.get("scanned_pdf"):
        return merge_step1_step2(s1, {}, os.path.basename(pdf_path))
    s2 = await run_step2(pdf_path, api_key, Step2Options())
    return merge_step1_step2(s1, s2, os.path.basename(pdf_path))


import os
from dataclasses import dataclass
from typing import Dict, List, Tuple, Optional

import PyPDF2
from pdf2image import convert_from_path

from google.generativeai import configure, GenerativeModel


@dataclass
class Step2Options:
    model_name: str = "gemini-1.5-flash"
    include_pages_2_3_text: bool = True
    max_chars_per_section: int = 6000


def read_page_texts(pdf_path: str, page_indices: List[int], max_chars: int) -> str:
    texts: List[str] = []
    with open(pdf_path, "rb") as f:
        reader = PyPDF2.PdfReader(f)
        for idx in page_indices:
            if idx < len(reader.pages):
                try:
                    t = reader.pages[idx].extract_text() or ""
                    if t:
                        texts.append(t)
                except Exception:
                    pass
    return ("\n".join(texts))[:max_chars]


def load_first_page_image(pdf_path: str):
    try:
        imgs = convert_from_path(pdf_path, first_page=1, last_page=1, dpi=200)
        return imgs[0] if imgs else None
    except Exception:
        return None


async def run_step2(pdf_path: str, api_key: str, options: Step2Options) -> Dict:
    configure(api_key=api_key)
    model = GenerativeModel(options.model_name)

    # Prepare prompt similar to enhanced extractor but minimal
    prompt = (
        "You are an expert in analyzing Moroccan academic documents. "
        "Extract titles (fr/en/ar), defense/submission dates, academic year, institutions "
        "(university/faculty/school/department), degree, language, and academic persons with roles. "
        "Return only JSON with keys thesis, university, faculty, school, department, degree, language, academic_persons, categories, keywords."
    )

    text_sections: Dict[str, str] = {
        "first_pages": read_page_texts(pdf_path, [0], options.max_chars_per_section)
    }
    if options.include_pages_2_3_text:
        text_sections["pages_2_3"] = read_page_texts(pdf_path, [1, 2], options.max_chars_per_section)
    image = load_first_page_image(pdf_path)

    parts: List = [prompt]
    for name, txt in text_sections.items():
        if txt.strip():
            parts.append(f"\n\n=== {name.upper()} SECTION ===\n{txt}")
    if image is not None:
        parts.append(image)

    # Call Gemini
    resp = model.generate_content(parts)
    raw = (resp.text or "").strip() if resp else ""
    if raw.startswith("```json"):
        raw = raw[7:]
    if raw.endswith("```"):
        raw = raw[:-3]
    try:
        import json
        return json.loads(raw) if raw else {}
    except Exception:
        return {}


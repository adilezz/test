import os
from dataclasses import dataclass
from typing import Dict, List, Tuple, Optional

import PyPDF2
from pdf2image import convert_from_path

from enhanced_gemini_extractor import create_enhanced_extractor


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
    extractor = create_enhanced_extractor(api_key, model_name=options.model_name)
    text_sections: Dict[str, str] = {
        "first_pages": read_page_texts(pdf_path, [0], options.max_chars_per_section)
    }
    if options.include_pages_2_3_text:
        text_sections["pages_2_3"] = read_page_texts(pdf_path, [1, 2], options.max_chars_per_section)
    image = load_first_page_image(pdf_path)
    return await extractor.extract_with_enhanced_gemini(text_sections, [image] if image else None)


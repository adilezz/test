import os
import re
from dataclasses import dataclass
from typing import List, Optional, Tuple, Dict

import PyPDF2


ABSTRACT_MARKERS = [
    ("fr", ["résumé", "resume", "resumé"]),
    ("en", ["abstract", "summary"]),
    ("ar", ["ملخص", "الخلاصة", "ملخّص"]),
]
TOC_MARKERS = ["sommaire", "table des matières", "table des matieres", "plan", "contenu"]
REF_MARKERS = ["bibliographie", "références", "references", "webographie"]
KWD_MARKERS = ["mots-clés", "mots cles", "keywords", "descripteurs"]


@dataclass
class Step1Options:
    max_pages: int = 15
    toc_pages: Tuple[int, int] = (3, 10)
    ref_tail_pages: int = 6
    min_text_ratio: float = 0.2


def extract_page_texts(path: str, max_pages: int) -> Tuple[int, List[str]]:
    texts: List[str] = []
    total_pages = 0
    with open(path, "rb") as f:
        reader = PyPDF2.PdfReader(f)
        total_pages = len(reader.pages)
        for i in range(min(max_pages, total_pages)):
            try:
                t = reader.pages[i].extract_text() or ""
                texts.append(t)
            except Exception:
                texts.append("")
    return total_pages, texts


def detect_scanned(texts: List[str], min_ratio: float) -> Tuple[int, int, float, bool]:
    pages_checked = len(texts)
    pages_with_text = sum(1 for t in texts if t and t.strip())
    ratio = (pages_with_text / pages_checked) if pages_checked else 0.0
    return pages_checked, pages_with_text, ratio, ratio < min_ratio


def find_abstracts(early_text: str) -> Dict[str, Optional[str]]:
    result = {"fr": None, "en": None, "ar": None}
    low = early_text.lower()
    for lang, markers in ABSTRACT_MARKERS:
        for m in markers:
            idx = low.find(m)
            if idx != -1:
                snippet = early_text[idx: idx + 6000]
                stop_re = re.compile(r"\n\s*(mots[- ]clés|mots cles|keywords|sommaire|table des matières|introduction|chapter|chapitre|références|bibliographie)\b", re.I)
                m_stop = stop_re.search(snippet)
                if m_stop:
                    snippet = snippet[:m_stop.start()]
                result[lang] = snippet.strip()
                break
    return result


def parse_toc(toc_text: str) -> List[str]:
    items: List[str] = []
    lines = [l.strip() for l in toc_text.splitlines() if l.strip()]
    for ln in lines:
        if re.search(r"\.\.+\s*\d+$", ln) or re.search(r"^(chapitre|chapter)\s+\d+", ln, re.I):
            items.append(ln)
        elif re.search(r"^\d+\s+.+\s+\d+$", ln):
            items.append(ln)
    seen = set()
    out: List[str] = []
    for it in items:
        if it not in seen:
            out.append(it)
            seen.add(it)
    return out[:150]


def estimate_references(ref_text: str) -> int:
    count = 0
    for ln in ref_text.splitlines():
        s = ln.strip()
        if not s:
            continue
        if re.match(r"^\[?\d+\]?\s*[\.-]", s):
            count += 1
        elif re.match(r"^[-•]", s):
            count += 1
        elif re.search(r"\d{4}\)", s) and ("," in s or ";" in s):
            count += 1
    return count


def run_step1(pdf_path: str, options: Step1Options) -> Dict:
    total_pages, early_texts = extract_page_texts(pdf_path, max_pages=options.max_pages)
    pages_checked, pages_with_text, ratio, scanned = detect_scanned(early_texts, options.min_text_ratio)
    result = {
        "file": os.path.basename(pdf_path),
        "total_pages": total_pages,
        "pages_checked": pages_checked,
        "pages_with_text": pages_with_text,
        "text_coverage_ratio": ratio,
        "scanned_pdf": scanned,
    }
    early_all = "\n".join(early_texts).lower()
    result["has_keywords_marker"] = any(k in early_all for k in KWD_MARKERS)
    if scanned:
        return result

    early_for_abs = "\n".join(early_texts[:5])
    abs_map = find_abstracts(early_for_abs)
    result["abstract_fr"] = abs_map.get("fr")
    result["abstract_en"] = abs_map.get("en")
    result["abstract_ar"] = abs_map.get("ar")

    # TOC pages
    start, end = options.toc_pages
    toc_texts: List[str] = []
    if total_pages:
        with open(pdf_path, "rb") as f:
            reader = PyPDF2.PdfReader(f)
            a = max(0, min(start - 1, total_pages - 1))
            b = max(0, min(end - 1, total_pages - 1))
            for p in range(a, b + 1):
                try:
                    t = reader.pages[p].extract_text() or ""
                    if any(m in t.lower() for m in TOC_MARKERS):
                        toc_texts.append(t)
                except Exception:
                    pass
    if toc_texts:
        toc_items = parse_toc("\n".join(toc_texts))
        if toc_items:
            result["toc_items"] = toc_items
            result["toc_start_page"] = start
            result["toc_end_page"] = end

    # References tail
    if total_pages:
        ref_start = max(0, total_pages - options.ref_tail_pages)
        tail_texts: List[str] = []
        with open(pdf_path, "rb") as f:
            reader = PyPDF2.PdfReader(f)
            for p in range(ref_start, total_pages):
                try:
                    t = reader.pages[p].extract_text() or ""
                    if any(m in t.lower() for m in REF_MARKERS):
                        tail_texts.append(t)
                except Exception:
                    pass
        if tail_texts:
            result["references_count"] = estimate_references("\n".join(tail_texts))

    return result


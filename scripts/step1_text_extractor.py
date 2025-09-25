#!/usr/bin/env python3
"""
Step 1: Text-only extraction pipeline

Goals:
- Detect and skip scanned PDFs (low text coverage in early pages)
- Extract abstracts (FR/EN/AR) from early pages using markers
- Extract Table of Contents from likely pages (3-10) without LLM
- Estimate references section size from last pages

Outputs per-PDF JSON and a summary CSV.
"""

import argparse
import csv
import json
import os
import re
from dataclasses import dataclass, asdict
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
class Step1Result:
    file: str
    total_pages: int
    pages_checked: int
    pages_with_text: int
    text_coverage_ratio: float
    scanned_pdf: bool
    abstract_fr: Optional[str] = None
    abstract_en: Optional[str] = None
    abstract_ar: Optional[str] = None
    has_keywords_marker: bool = False
    toc_items: Optional[List[str]] = None
    toc_start_page: Optional[int] = None
    toc_end_page: Optional[int] = None
    references_count: Optional[int] = None


def extract_page_texts(path: str, max_pages: int) -> Tuple[int, List[str]]:
    texts: List[str] = []
    total_pages = 0
    try:
        with open(path, "rb") as f:
            reader = PyPDF2.PdfReader(f)
            total_pages = len(reader.pages)
            for i in range(min(max_pages, total_pages)):
                try:
                    t = reader.pages[i].extract_text() or ""
                    texts.append(t)
                except Exception:
                    texts.append("")
    except Exception:
        pass
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
                # Extract from marker to next heading-like boundary or up to 6000 chars
                snippet = early_text[idx: idx + 6000]
                # Stop at common heading/boundary words
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
        # Look for dotted leaders or chapter patterns
        if re.search(r"\.\.+\s*\d+$", ln) or re.search(r"^(chapitre|chapter)\s+\d+", ln, re.I):
            items.append(ln)
        elif re.search(r"^\d+\s+.+\s+\d+$", ln):
            items.append(ln)
    # Deduplicate while preserving order
    seen = set()
    out: List[str] = []
    for it in items:
        if it not in seen:
            out.append(it)
            seen.add(it)
    return out[:150]


def estimate_references(ref_text: str) -> int:
    # Count lines that look like reference entries
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


def extract_step1_for_pdf(path: str, max_pages: int, toc_pages: Tuple[int, int], ref_tail_pages: int, min_text_ratio: float) -> Step1Result:
    total_pages, early_texts = extract_page_texts(path, max_pages=max_pages)
    pages_checked, pages_with_text, ratio, scanned = detect_scanned(early_texts, min_text_ratio)
    res = Step1Result(
        file=os.path.basename(path),
        total_pages=total_pages,
        pages_checked=pages_checked,
        pages_with_text=pages_with_text,
        text_coverage_ratio=ratio,
        scanned_pdf=scanned,
    )
    # Keywords marker
    early_all = "\n".join(early_texts).lower()
    res.has_keywords_marker = any(k in early_all for k in KWD_MARKERS)

    if scanned:
        return res

    # Abstracts from first 5 pages
    early_for_abs = "\n".join(early_texts[:5])
    abs_map = find_abstracts(early_for_abs)
    res.abstract_fr = abs_map.get("fr")
    res.abstract_en = abs_map.get("en")
    res.abstract_ar = abs_map.get("ar")

    # TOC from pages 3-10
    start, end = toc_pages
    toc_texts: List[str] = []
    if total_pages:
        try:
            with open(path, "rb") as f:
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
        except Exception:
            pass
    if toc_texts:
        toc_items = parse_toc("\n".join(toc_texts))
        if toc_items:
            res.toc_items = toc_items
            res.toc_start_page = start
            res.toc_end_page = end

    # References from last N pages
    if total_pages:
        ref_start = max(0, total_pages - ref_tail_pages)
        tail_texts: List[str] = []
        try:
            with open(path, "rb") as f:
                reader = PyPDF2.PdfReader(f)
                for p in range(ref_start, total_pages):
                    try:
                        t = reader.pages[p].extract_text() or ""
                        if any(m in t.lower() for m in REF_MARKERS):
                            tail_texts.append(t)
                    except Exception:
                        pass
        except Exception:
            pass
        if tail_texts:
            res.references_count = estimate_references("\n".join(tail_texts))

    return res


def write_json(obj: dict, path: str) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=2)


def main():
    ap = argparse.ArgumentParser(description="Step 1 text-only extractor")
    ap.add_argument("--input-dir", required=True, help="Directory with PDFs")
    ap.add_argument("--outdir", required=True, help="Output directory for JSON and CSV")
    ap.add_argument("--limit", type=int, default=100, help="Max PDFs to process")
    ap.add_argument("--max-pages", type=int, default=15, help="Max early pages to inspect for text/abstracts")
    ap.add_argument("--toc-pages", type=str, default="3-10", help="TOC search page range, e.g., 3-10")
    ap.add_argument("--ref-tail-pages", type=int, default=5, help="How many last pages to check for references")
    ap.add_argument("--min-text-ratio", type=float, default=0.2, help="Min text coverage ratio to consider non-scanned")
    args = ap.parse_args()

    if not os.path.isdir(args.input_dir):
        raise SystemExit(f"Input directory not found: {args.input_dir}")
    os.makedirs(args.outdir, exist_ok=True)

    # Collect PDFs
    files = [os.path.join(args.input_dir, f) for f in os.listdir(args.input_dir) if f.lower().endswith(".pdf")]
    files.sort(key=lambda p: os.path.getmtime(p))
    if args.limit > 0:
        files = files[:args.limit]

    # Parse TOC page range
    m = re.match(r"(\d+)-(\d+)$", args.toc_pages)
    toc_range = (3, 10)
    if m:
        a, b = int(m.group(1)), int(m.group(2))
        if a <= b:
            toc_range = (a, b)

    per_file_dir = os.path.join(args.outdir, "step1_text")
    csv_path = os.path.join(args.outdir, "step1_text_summary.csv")
    rows: List[dict] = []

    for path in files:
        res = extract_step1_for_pdf(
            path=path,
            max_pages=args.max_pages,
            toc_pages=toc_range,
            ref_tail_pages=args.ref_tail_pages,
            min_text_ratio=args.min_text_ratio,
        )
        base = os.path.splitext(os.path.basename(path))[0]
        out_json = os.path.join(per_file_dir, f"{base}.step1.json")
        write_json(asdict(res), out_json)
        rows.append({
            "file": res.file,
            "total_pages": res.total_pages,
            "text_coverage_ratio": f"{res.text_coverage_ratio:.3f}",
            "scanned_pdf": res.scanned_pdf,
            "abstract_fr_present": bool(res.abstract_fr),
            "abstract_en_present": bool(res.abstract_en),
            "abstract_ar_present": bool(res.abstract_ar),
            "toc_items_count": len(res.toc_items) if res.toc_items else 0,
            "references_count": res.references_count or 0,
        })

    # Write summary CSV
    with open(csv_path, "w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys()) if rows else [])
        if rows:
            w.writeheader()
            for r in rows:
                w.writerow(r)

    print(f"Processed {len(rows)} PDFs. Summary: {csv_path}")


if __name__ == "__main__":
    main()


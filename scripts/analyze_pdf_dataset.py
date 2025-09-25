#!/usr/bin/env python3
"""
Analyze a set of thesis PDFs for content characteristics relevant to metadata extraction.

For each PDF, extract basic stats:
- total pages
- proportion of pages with extractable text
- presence of Abstract/Résumé indicators
- presence of Table of Contents indicators (Sommaire/Table des matières)
- presence of References/Bibliography indicators
- presence of Keywords/Mots-clés indicators
- simple language hints (FR/EN/AR) from text samples

Outputs a CSV with per-file stats and a JSON summary with dataset-level aggregates.
"""

import argparse
import csv
import json
import os
import re
import statistics
from typing import Dict, List, Tuple

import PyPDF2


ABSTRACT_MARKERS = [
    "résumé", "resume", "abstract", "ملخص", "الخلاصة"
]
TOC_MARKERS = [
    "sommaire", "table des matières", "table des matieres", "plan", "contenu"
]
REF_MARKERS = [
    "bibliographie", "références", "references", "webographie"
]
KEYWORDS_MARKERS = [
    "mots-clés", "mots cles", "keywords", "descripteurs"
]

FR_HINTS = [" le ", " la ", " les ", " de ", " des ", " et ", " à ", " pour "]
EN_HINTS = [" the ", " and ", " of ", " to ", " for ", " in "]


def has_arabic(text: str) -> bool:
    return bool(re.search(r"[\u0600-\u06FF]", text))


def read_pdf_text_sample(path: str, max_pages: int = 12) -> Tuple[int, int, str]:
    total_pages = 0
    pages_with_text = 0
    sample_text = []
    try:
        with open(path, "rb") as f:
            reader = PyPDF2.PdfReader(f)
            total_pages = len(reader.pages)
            pages_to_check = min(total_pages, max_pages)
            for i in range(pages_to_check):
                try:
                    txt = reader.pages[i].extract_text() or ""
                    if txt.strip():
                        pages_with_text += 1
                    sample_text.append(txt[:4000])
                except Exception:
                    sample_text.append("")
    except Exception:
        pass
    return total_pages, pages_with_text, "\n".join(sample_text)


def detect_markers(text: str, markers: List[str]) -> bool:
    low = text.lower()
    return any(m in low for m in markers)


def language_hint(text: str) -> str:
    low = f" {text.lower()} "
    fr = sum(low.count(h) for h in FR_HINTS)
    en = sum(low.count(h) for h in EN_HINTS)
    ar = 5 if has_arabic(low) else 0
    if max(fr, en, ar) == 0:
        return "unknown"
    if fr >= en and fr >= ar:
        return "fr"
    if en >= fr and en >= ar:
        return "en"
    return "ar"


def analyze_dir(input_dir: str, limit: int) -> Dict:
    pdfs = [os.path.join(input_dir, f) for f in os.listdir(input_dir) if f.lower().endswith(".pdf")]
    pdfs.sort(key=lambda p: os.path.getmtime(p))
    if limit > 0:
        pdfs = pdfs[:limit]

    rows = []
    for path in pdfs:
        total_pages, pages_with_text, text = read_pdf_text_sample(path)
        has_abs = detect_markers(text, ABSTRACT_MARKERS)
        has_toc = detect_markers(text, TOC_MARKERS)
        has_ref = detect_markers(text, REF_MARKERS)
        has_kwd = detect_markers(text, KEYWORDS_MARKERS)
        lang = language_hint(text)
        rows.append({
            "file": os.path.basename(path),
            "total_pages": total_pages,
            "pages_with_text": pages_with_text,
            "text_coverage_ratio": (pages_with_text / total_pages) if total_pages else 0.0,
            "has_abstract_marker": has_abs,
            "has_toc_marker": has_toc,
            "has_references_marker": has_ref,
            "has_keywords_marker": has_kwd,
            "lang_hint": lang,
        })

    # Aggregates
    totals = [r["total_pages"] for r in rows if r["total_pages"] > 0]
    coverages = [r["text_coverage_ratio"] for r in rows]
    summary = {
        "num_pdfs": len(rows),
        "pages": {
            "mean": statistics.mean(totals) if totals else 0,
            "median": statistics.median(totals) if totals else 0,
            "min": min(totals) if totals else 0,
            "max": max(totals) if totals else 0,
        },
        "text_coverage": {
            "mean": statistics.mean(coverages) if coverages else 0.0,
            "pct_ge_50": sum(1 for c in coverages if c >= 0.5) / len(coverages) if coverages else 0.0,
            "pct_ge_80": sum(1 for c in coverages if c >= 0.8) / len(coverages) if coverages else 0.0,
        },
        "field_markers": {
            "abstract_rate": sum(1 for r in rows if r["has_abstract_marker"]) / len(rows) if rows else 0.0,
            "toc_rate": sum(1 for r in rows if r["has_toc_marker"]) / len(rows) if rows else 0.0,
            "references_rate": sum(1 for r in rows if r["has_references_marker"]) / len(rows) if rows else 0.0,
            "keywords_rate": sum(1 for r in rows if r["has_keywords_marker"]) / len(rows) if rows else 0.0,
        },
        "language_hint_distribution": {
            k: sum(1 for r in rows if r["lang_hint"] == k) for k in ["fr", "en", "ar", "unknown"]
        },
    }

    return {"rows": rows, "summary": summary}


def write_outputs(result: Dict, out_dir: str) -> None:
    os.makedirs(out_dir, exist_ok=True)
    # CSV
    csv_path = os.path.join(out_dir, "pre_gemini_per_file.csv")
    with open(csv_path, "w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(result["rows"][0].keys()) if result["rows"] else [])
        if result["rows"]:
            w.writeheader()
            for r in result["rows"]:
                w.writerow(r)
    # JSON summary
    json_path = os.path.join(out_dir, "pre_gemini_summary.json")
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(result["summary"], f, ensure_ascii=False, indent=2)
    print(json.dumps(result["summary"], ensure_ascii=False, indent=2))


def main():
    p = argparse.ArgumentParser(description="Analyze PDFs for metadata signals")
    p.add_argument("--input-dir", required=True, help="Directory of PDFs")
    p.add_argument("--limit", type=int, default=100, help="Max PDFs to process")
    p.add_argument("--outdir", required=True, help="Output directory for reports")
    args = p.parse_args()

    res = analyze_dir(args.input_dir, args.limit)
    write_outputs(res, args.outdir)


if __name__ == "__main__":
    main()


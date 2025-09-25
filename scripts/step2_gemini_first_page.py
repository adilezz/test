#!/usr/bin/env python3
"""
Step 2: Gemini first-page extractor

- Loads the first page of each non-scanned PDF
- Extracts: titles, academic persons + roles, institutions, degree, defense date, language
- Minimizes tokens by sending only the first page text and a single image of page 1
- Uses environment variable GEMINI_API_KEY (fallback to CLI arg)

Outputs per-file JSON and a CSV summary.
"""

import argparse
import asyncio
import csv
import json
import os
from typing import List, Tuple

import PyPDF2
from pdf2image import convert_from_path

from enhanced_gemini_extractor import create_enhanced_extractor


def read_first_page_text(pdf_path: str) -> str:
    try:
        with open(pdf_path, "rb") as f:
            reader = PyPDF2.PdfReader(f)
            if reader.pages:
                return (reader.pages[0].extract_text() or "").strip()
    except Exception:
        pass
    return ""


def load_first_page_image(pdf_path: str):
    try:
        imgs = convert_from_path(pdf_path, first_page=1, last_page=1, dpi=200)
        return imgs[0] if imgs else None
    except Exception:
        return None


async def process_file(extractor, pdf_path: str) -> Tuple[str, dict]:
    # Construct minimal text_sections and single image
    text_sections = {
        "first_pages": read_first_page_text(pdf_path)[:6000]
    }
    image = load_first_page_image(pdf_path)
    metadata = await extractor.extract_with_enhanced_gemini(text_sections, [image] if image else None)
    return os.path.basename(pdf_path), metadata or {}


async def run_batch(input_dir: str, outdir: str, limit: int, concurrency: int, api_key: str) -> int:
    pdfs = [os.path.join(input_dir, f) for f in os.listdir(input_dir) if f.lower().endswith(".pdf")]
    pdfs.sort(key=lambda p: os.path.getmtime(p))
    if limit > 0:
        pdfs = pdfs[:limit]

    os.makedirs(outdir, exist_ok=True)
    extractor = create_enhanced_extractor(api_key)

    sem = asyncio.Semaphore(concurrency)
    results: List[Tuple[str, dict]] = []

    async def worker(path: str):
        async with sem:
            name, md = await process_file(extractor, path)
            # Persist per-file JSON
            with open(os.path.join(outdir, f"{os.path.splitext(name)[0]}.step2.gemini.json"), "w", encoding="utf-8") as f:
                json.dump(md, f, ensure_ascii=False, indent=2)
            results.append((name, md))

    await asyncio.gather(*(worker(p) for p in pdfs))

    # Write CSV summary
    csv_path = os.path.join(outdir, "step2_gemini_summary.csv")
    with open(csv_path, "w", encoding="utf-8", newline="") as f:
        w = csv.writer(f)
        w.writerow(["file", "title_fr", "defense_date", "persons_count", "university_fr"]) 
        for name, md in results:
            thesis = (md or {}).get("thesis", {})
            persons = (md or {}).get("academic_persons", []) or []
            univ = (md or {}).get("university", {})
            w.writerow([
                name,
                thesis.get("title_fr") or "",
                thesis.get("defense_date") or "",
                len(persons),
                univ.get("name_fr") or "",
            ])

    print(f"Processed {len(results)} PDFs. Summary: {csv_path}")
    return 0


def main():
    ap = argparse.ArgumentParser(description="Gemini first-page extractor")
    ap.add_argument("--input-dir", required=True)
    ap.add_argument("--outdir", required=True)
    ap.add_argument("--limit", type=int, default=100)
    ap.add_argument("--concurrency", type=int, default=2)
    ap.add_argument("--api-key", default=os.getenv("GEMINI_API_KEY", ""))
    args = ap.parse_args()

    if not args.api_key:
        raise SystemExit("GEMINI_API_KEY not set; provide via --api-key or environment")

    return asyncio.run(run_batch(args.input_dir, args.outdir, args.limit, args.concurrency, args.api_key))


if __name__ == "__main__":
    raise SystemExit(main())
#!/usr/bin/env python3
"""
Run batch metadata extraction on a directory of PDFs using EnhancedGeminiExtractor.

Writes per-file JSON outputs and a CSV summary with success, confidence, and timing.
"""

import argparse
import asyncio
import csv
import glob
import json
import os
import sys
from typing import List

from enhanced_gemini_extractor import create_enhanced_extractor


def list_pdfs(input_dir: str, limit: int) -> List[str]:
    paths = sorted(
        [p for p in glob.glob(os.path.join(input_dir, "**", "*.pdf"), recursive=True)],
        key=lambda p: os.path.getsize(p),
        reverse=True,
    )
    return paths[:limit] if limit > 0 else paths


async def run_batch(input_dir: str, outdir: str, limit: int, concurrency: int) -> int:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("GEMINI_API_KEY not set; cannot run extraction.")
        return 1

    os.makedirs(outdir, exist_ok=True)
    extractor = create_enhanced_extractor(api_key)

    pdfs = list_pdfs(input_dir, limit)
    print(f"Found {len(pdfs)} PDFs to process")

    sem = asyncio.Semaphore(concurrency)
    results = []

    async def process(path: str):
        async with sem:
            res = await extractor.extract_enhanced_metadata(path)
            base = os.path.splitext(os.path.basename(path))[0]
            json_out = os.path.join(outdir, f"{base}.extracted.json")
            with open(json_out, "w", encoding="utf-8") as f:
                json.dump({
                    "success": res.success,
                    "confidence": res.confidence_score,
                    "processing_time": res.processing_time,
                    "error": res.error_message,
                    "metadata": res.metadata,
                }, f, ensure_ascii=False, indent=2)
            results.append((path, res))

    await asyncio.gather(*(process(p) for p in pdfs))

    # Write summary CSV
    csv_path = os.path.join(outdir, "batch_summary.csv")
    with open(csv_path, "w", encoding="utf-8", newline="") as f:
        w = csv.writer(f)
        w.writerow(["file", "success", "confidence", "processing_time", "error"])
        for path, res in results:
            w.writerow([
                os.path.basename(path),
                res.success,
                f"{res.confidence_score:.3f}" if res.confidence_score is not None else "",
                f"{res.processing_time:.2f}" if res.processing_time is not None else "",
                res.error_message or "",
            ])

    ok = sum(1 for _, r in results if r.success)
    print(f"Completed: {ok}/{len(results)} successful")
    return 0


def main():
    parser = argparse.ArgumentParser(description="Run Gemini batch extraction")
    parser.add_argument("--input-dir", required=True, help="Directory of PDFs")
    parser.add_argument("--outdir", required=True, help="Output directory for JSON and summary")
    parser.add_argument("--limit", type=int, default=120, help="Max PDFs to process")
    parser.add_argument("--concurrency", type=int, default=2, help="Concurrent extractions")
    args = parser.parse_args()

    return asyncio.run(run_batch(args.input_dir, args.outdir, args.limit, args.concurrency))


if __name__ == "__main__":
    sys.exit(main())


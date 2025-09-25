#!/usr/bin/env python3
"""
Download thesis PDFs from the Toubkal (DSpace) repository given a list of handle URLs.

Reads input file containing one handle URL per line (e.g., https://toubkal.imist.ma/handle/123456789/914),
fetches the HTML, discovers the bitstream PDF URL, and downloads the PDF to the output directory.

Outputs a CSV log file with download results.
"""

import argparse
import csv
import os
import re
import sys
import time
from dataclasses import dataclass
from typing import List, Optional, Tuple

import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse


BASE_URL = "https://toubkal.imist.ma/"


@dataclass
class DownloadOutcome:
    handle_url: str
    pdf_url: Optional[str]
    status: str
    file_path: Optional[str]
    error: Optional[str]
    content_bytes: int = 0


def read_handle_urls(input_path: str, max_count: Optional[int]) -> List[str]:
    with open(input_path, "r", encoding="utf-8") as f:
        lines = [line.strip() for line in f if line.strip()]
    return lines[: max_count or len(lines)]


def sanitize_filename(name: str) -> str:
    return re.sub(r"[^A-Za-z0-9_.-]", "_", name)


def extract_pdf_url_from_handle_page(html: str, base: str) -> Optional[str]:
    soup = BeautifulSoup(html, "lxml")
    # DSpace often exposes links like /bitstream/handle/123456789/.../filename.pdf?sequence=1&isAllowed=y
    for a in soup.find_all("a", href=True):
        href = a["href"]
        if "/bitstream/" in href and (href.lower().endswith(".pdf") or "pdf" in href.lower()):
            return urljoin(base, href)
    return None


def fetch_handle_page(handle_url: str, session: requests.Session, timeout: int = 20) -> Tuple[Optional[str], Optional[str]]:
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (compatible; thesis-downloader/1.0; +https://example.local)"
        }
        resp = session.get(handle_url, headers=headers, timeout=timeout)
        if resp.status_code != 200:
            return None, f"HTTP {resp.status_code}"
        return resp.text, None
    except Exception as e:
        return None, str(e)


def download_pdf(pdf_url: str, outdir: str, session: requests.Session, min_bytes: int, timeout: int = 60) -> Tuple[Optional[str], int, Optional[str]]:
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (compatible; thesis-downloader/1.0; +https://example.local)"
        }
        with session.get(pdf_url, headers=headers, stream=True, timeout=timeout) as r:
            if r.status_code != 200:
                return None, 0, f"HTTP {r.status_code}"
            # Determine filename
            parsed = urlparse(pdf_url)
            filename = os.path.basename(parsed.path) or "download.pdf"
            filename = sanitize_filename(filename)
            filepath = os.path.join(outdir, filename)

            os.makedirs(outdir, exist_ok=True)
            bytes_written = 0
            with open(filepath, "wb") as f:
                for chunk in r.iter_content(chunk_size=1024 * 128):
                    if chunk:
                        f.write(chunk)
                        bytes_written += len(chunk)
            if bytes_written < min_bytes:
                return None, bytes_written, f"Too small ({bytes_written} < {min_bytes})"
            return filepath, bytes_written, None
    except Exception as e:
        return None, 0, str(e)


def process_handles(
    handle_urls: List[str], outdir: str, limit: Optional[int], min_bytes: int, delay_s: float
) -> List[DownloadOutcome]:
    session = requests.Session()
    results: List[DownloadOutcome] = []
    total = len(handle_urls)
    for idx, handle_url in enumerate(handle_urls, start=1):
        html, err = fetch_handle_page(handle_url, session)
        if html is None:
            results.append(DownloadOutcome(handle_url, None, "handle_fetch_failed", None, err))
            if delay_s:
                time.sleep(delay_s)
            continue

        pdf_url = extract_pdf_url_from_handle_page(html, BASE_URL)
        if not pdf_url:
            results.append(DownloadOutcome(handle_url, None, "pdf_not_found", None, None))
            if delay_s:
                time.sleep(delay_s)
            continue

        filepath, nbytes, derr = download_pdf(pdf_url, outdir, session, min_bytes=min_bytes)
        if filepath is None:
            results.append(DownloadOutcome(handle_url, pdf_url, "download_failed", None, derr, nbytes))
        else:
            results.append(DownloadOutcome(handle_url, pdf_url, "ok", filepath, None, nbytes))

        if delay_s:
            time.sleep(delay_s)

        if limit and idx >= limit:
            break

    return results


def write_results_csv(results: List[DownloadOutcome], csv_path: str) -> None:
    fieldnames = ["handle_url", "pdf_url", "status", "file_path", "error", "content_bytes"]
    with open(csv_path, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for r in results:
            writer.writerow(
                {
                    "handle_url": r.handle_url,
                    "pdf_url": r.pdf_url or "",
                    "status": r.status,
                    "file_path": r.file_path or "",
                    "error": r.error or "",
                    "content_bytes": r.content_bytes,
                }
            )


def main():
    parser = argparse.ArgumentParser(description="Download PDFs from Toubkal handle URLs")
    parser.add_argument("--input", required=True, help="Path to liste_URLs file")
    parser.add_argument("--outdir", required=True, help="Directory to save PDFs")
    parser.add_argument("--limit", type=int, default=0, help="Max number of handles to process")
    parser.add_argument("--min-bytes", type=int, default=50000, help="Minimum bytes for a valid PDF")
    parser.add_argument("--delay", type=float, default=0.5, help="Delay between requests in seconds")
    parser.add_argument("--log-csv", default="/workspace/scripts/download_results.csv", help="CSV log path")

    args = parser.parse_args()
    handles = read_handle_urls(args.input, args.limit if args.limit and args.limit > 0 else None)
    print(f"Found {len(handles)} handle URLs to process")

    results = process_handles(handles, args.outdir, None, args.min_bytes, args.delay)
    ok = sum(1 for r in results if r.status == "ok")
    print(f"Downloaded {ok}/{len(results)} PDFs")

    os.makedirs(os.path.dirname(args.log_csv), exist_ok=True)
    write_results_csv(results, args.log_csv)
    print(f"Results written to {args.log_csv}")


if __name__ == "__main__":
    sys.exit(main())


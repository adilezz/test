#!/usr/bin/env python3
"""
Merge Step 1 (text-only) and Step 2 (Gemini first pages) into unified records
aligned to the theses/extraction job schema fields.

- Prefer Step 1 for abstracts, table_of_contents, references_count
- Use Step 2 for titles, academic persons/roles, institutions, degree, dates, language
- Compose a single JSON per file and a consolidated CSV summary
"""

import argparse
import csv
import json
import os
import glob
from typing import Dict


def load_json(path: str) -> Dict:
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}


def prefer(a, b):
    return a if a not in (None, "") else b


def merge_record(step1: Dict, step2: Dict, file_name: str) -> Dict:
    th2 = step2.get("thesis") or {}
    uni2 = step2.get("university") or {}
    fac2 = step2.get("faculty") or {}
    sch2 = step2.get("school") or {}
    dep2 = step2.get("department") or {}
    deg2 = step2.get("degree") or {}
    lang2 = step2.get("language") or {}
    persons2 = step2.get("academic_persons") or []

    # thesis fields
    thesis = {
        "title_fr": th2.get("title_fr"),
        "title_en": th2.get("title_en"),
        "title_ar": th2.get("title_ar"),
        # Prefer Step 1 abstracts if present
        "abstract_fr": prefer(step1.get("abstract_fr"), th2.get("abstract_fr")),
        "abstract_en": prefer(step1.get("abstract_en"), th2.get("abstract_en")),
        "abstract_ar": prefer(step1.get("abstract_ar"), th2.get("abstract_ar")),
        "defense_date": th2.get("defense_date"),
        "submission_date": th2.get("submission_date"),
        "academic_year": th2.get("academic_year"),
        "page_count": th2.get("total_pages") or th2.get("page_count"),
        "thesis_number": th2.get("thesis_number"),
        # Step 1 extras
        "table_of_contents": step1.get("toc_items"),
        "references_count": step1.get("references_count"),
    }

    # institutions
    university = uni2
    faculty = fac2
    school = sch2
    department = dep2

    # degree + language
    degree = deg2
    language = lang2

    # persons
    academic_persons = persons2

    # Compose schema-aligned structure
    merged = {
        "file_name": file_name,
        "thesis": thesis,
        "university": university,
        "faculty": faculty,
        "school": school,
        "department": department,
        "degree": degree,
        "language": language,
        "academic_persons": academic_persons,
        # extras: categories/keywords from step2 if present
        "categories": step2.get("categories") or [],
        "keywords": step2.get("keywords") or [],
        # step1 diagnostics
        "scanned_pdf": bool(step1.get("scanned_pdf")),
        "has_keywords_marker": bool(step1.get("has_keywords_marker")),
    }
    return merged


def main():
    ap = argparse.ArgumentParser(description="Merge Step1 and Step2 outputs")
    ap.add_argument("--step1-dir", required=True)
    ap.add_argument("--step2-dir", required=True)
    ap.add_argument("--outdir", required=True)
    args = ap.parse_args()

    os.makedirs(args.outdir, exist_ok=True)

    # Index step1 by base name
    s1_paths = glob.glob(os.path.join(args.step1_dir, "*.step1.json"))
    s1_map = {os.path.splitext(os.path.basename(p))[0]: p for p in s1_paths}

    # Iterate step2 and merge when step1 exists
    merged_rows = []
    for p2 in glob.glob(os.path.join(args.step2_dir, "*.step2.gemini.json")):
        base = os.path.splitext(os.path.basename(p2))[0]
        p1 = s1_map.get(base)
        s1 = load_json(p1) if p1 else {}
        s2 = load_json(p2)

        merged = merge_record(s1, s2, file_name=base + ".pdf")
        out_json = os.path.join(args.outdir, base + ".merged.json")
        with open(out_json, "w", encoding="utf-8") as f:
            json.dump(merged, f, ensure_ascii=False, indent=2)

        th = merged.get("thesis") or {}
        merged_rows.append({
            "file": merged.get("file_name"),
            "title_fr": th.get("title_fr") or "",
            "defense_date": th.get("defense_date") or "",
            "abstract_fr_present": bool(th.get("abstract_fr")),
            "toc_items": len(th.get("table_of_contents") or []),
            "references_count": th.get("references_count") or 0,
            "persons": len(merged.get("academic_persons") or []),
            "university_fr": (merged.get("university") or {}).get("name_fr") or "",
        })

    # CSV summary
    csv_path = os.path.join(args.outdir, "merged_summary.csv")
    with open(csv_path, "w", encoding="utf-8", newline="") as f:
        if merged_rows:
            w = csv.DictWriter(f, fieldnames=list(merged_rows[0].keys()))
            w.writeheader()
            for r in merged_rows:
                w.writerow(r)

    print(f"Merged {len(merged_rows)} records. Summary: {csv_path}")


if __name__ == "__main__":
    main()
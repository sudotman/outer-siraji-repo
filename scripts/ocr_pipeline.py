#!/usr/bin/env python3
"""
OCR/refinement pipeline (v1, lean) for IA/DLI assets → CSV/JSON

Inputs: in.ernet.dli.2015.223292/*.djvu.{xml,txt} (already OCRed by ABBYY)
Outputs:
  - review/dictionary_raw.csv (rough rows parsed from djvu.txt)
  - review/dictionary_review.csv (same with columns for suggestions/final)

This v1 uses heuristics because ABBYY text is line-oriented. It aims to capture
headwords and trailing gloss blocks. Adjust parsing rules as we learn the layout.
"""

from __future__ import annotations
import csv
import json
import os
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ARCHIVE = ROOT / "in.ernet.dli.2015.223292"
DJVU_TXT = ARCHIVE / "2015.223292.A-Dictionary_djvu.txt"
OUT_DIR = ROOT / "review"

HEAD_RE = re.compile(r"^\s*([A-Za-zÀ-ž\-\'\(\)\[\]{}·\.]+)\s*(?:,\s*(n|v|adj|adv|pron|prep|post))?\s*:\s*(.*)$")

def is_probable_head(line: str) -> bool:
    # Heuristics: head may start at column start and contain ASCII/Latin with optional diacritics
    if not line: return False
    if len(line) > 150: return False
    if ':' not in line: return False
    if line.strip().endswith('.') is False:
        pass
    # avoid paragraph junk
    if sum(c.isalpha() for c in line) < 3:
        return False
    return True

def parse_blocks(lines: list[str]) -> list[dict]:
    rows = []
    for raw in lines:
        line = raw.strip()
        if not is_probable_head(line):
            continue
        m = HEAD_RE.match(line)
        if not m:
            # fallback: split on first colon
            if ':' in line:
                head, rest = line.split(':', 1)
                head = head.strip()
                gloss = rest.strip()
                pos = ''
            else:
                continue
        else:
            head, pos, gloss = m.group(1), (m.group(2) or ''), m.group(3)
        rows.append({
            'id': f'raw-{len(rows)+1:05d}',
            'head_roman': head,
            'head_deva': '',
            'pos': pos,
            'gloss_en': gloss,
            'gloss_hi': '',
            'examples_json': '[]',
            'notes': '',
            'ocr_confidence': ''
        })
    return rows

def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    if not DJVU_TXT.exists():
        raise SystemExit(f"Missing: {DJVU_TXT}")
    text = DJVU_TXT.read_text(encoding='utf-8', errors='ignore')
    lines = [ln.rstrip() for ln in text.splitlines()]
    rows = parse_blocks(lines)
    raw_csv = OUT_DIR / 'dictionary_raw.csv'
    with raw_csv.open('w', newline='', encoding='utf-8') as f:
        w = csv.DictWriter(f, fieldnames=[
            'id','head_deva','head_roman','pos','gloss_en','gloss_hi','examples_json','notes','ocr_confidence'
        ])
        w.writeheader()
        for r in rows:
            w.writerow(r)
    # Initialize review sheet with same rows plus suggestion fields
    review_csv = OUT_DIR / 'dictionary_review.csv'
    with review_csv.open('w', newline='', encoding='utf-8') as f:
        fieldnames = [
            'id','head_deva','head_roman','pos','gloss_en','gloss_hi','examples_json','notes','ocr_confidence',
            'suggest_head_deva','suggest_head_roman','suggest_pos','suggest_gloss_en','suggest_gloss_hi','decision'
        ]
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        for r in rows:
            w.writerow({**r, **{k:'' for k in fieldnames if k not in r}})
    print(f"Wrote {len(rows)} rows to {raw_csv} and initialized {review_csv}")

if __name__ == '__main__':
    main()



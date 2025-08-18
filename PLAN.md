## Outer Siraji Preservation — Lean Site Plan (GH Pages)

### Goals
- Build a fast, low-maintenance static site on GitHub Pages.
- Start with externally embedded audio/video only (YouTube, Internet Archive, etc.).
- Publish a searchable dictionary derived from an existing PDF, with a light OCR + refinement pipeline and human review.

### Stack (lean, static)
- Generator: Eleventy (11ty) static site (no client framework runtime).
- Styling: minimal CSS (optionally Tailwind via build, can be added later).
- Search: client-side MiniSearch/Lunr index generated at build time.
- Hosting: GitHub Pages (build via GitHub Actions).
- Content storage: Markdown + JSON in repo; media embedded via external URLs.

### Information Architecture
- Homepage: intro, brief history highlights, featured dictionary items, featured works.
- Dictionary: list + detail pages; instant client-side search; A–Z browse.
- History: narrative timeline with photos/captions.
- Works: grid/list of audio/video/text with external embeds/links; filters by type/year.
- Contribute: how to help, word/entry suggestion link (GitHub Issue or Google Form for now).

### Data model (v1, static JSON)
Each entry is a JSON object; a single `data/dictionary.json` file (or chunked: `data/dictionary-*.json`).

```json
{
  "id": "lem-0001",
  "head": { "devanagari": "…", "roman": "…" },
  "pos": "noun",
  "ipa": "…",
  "senses": [
    {
      "gloss_en": "…",
      "gloss_hi": "…",
      "definition": "…",
      "examples": [
        { "siraji": "…", "en": "…", "hi": "…" }
      ],
      "domains": ["kinship"]
    }
  ],
  "audio": [ { "url": "https://youtu.be/...#t=30", "speaker": "spk-01" } ],
  "video": [ { "url": "https://archive.org/..." } ],
  "tags": ["variant:outer-siraji"],
  "updatedAt": "2025-08-18"
}
```

Notes:
- Keep fields optional; store as UTF-8; prefer Devanagari + Roman for v1. Takri can be added later as `head.takri`.
- For large datasets, split into `data/dictionary-A.json`, `-B.json`, … and load progressively.

### Search (client-side)
- Build a compact index (MiniSearch or Lunr) at build time from the JSON.
- Index: `head.devanagari`, `head.roman`, `senses.gloss_en`, `senses.gloss_hi`, examples.
- Normalization: diacritics-insensitive; simple transliteration for search (roman ⇄ devanagari) can be added later.
- UI: search box with instant results; filters: part of speech, domain, has-audio.

### OCR + Refinement pipeline (PDF → clean JSON)
Goal: get structured entries with confidence scoring and a human review step.

1) Prefer existing IA outputs (lean)
- Use the provided ABBYY outputs first to avoid heavy OCR runs:
  - `2015.223292.A-Dictionary_djvu.txt` for quick text pass (already in repo).
  - `2015.223292.A-Dictionary_djvu.xml` (DjVuXML) for word-level coordinates and page structure.
- Only fall back to running `ocrmypdf` if coverage/quality is insufficient.

2) Parsing & structuring
- Use a Python script to parse the ABBYY `djvu.txt` (v1 heuristic) and, where needed, refine with the `djvu.xml` word blocks.
- Normalize whitespace, punctuation, and known OCR confusions (e.g., `न` vs `प`, diacritics).
- Emit `dictionary_raw.csv` with columns: `id, head_deva, head_roman, pos, gloss_en, gloss_hi, examples_json, notes, ocr_confidence`.

3) Model-assisted cleanup
- Rule-based correction (SymSpell/JamSpell) with custom lexicon seeded from frequent headwords.
- Flag low-confidence rows (by HOCR confidence or edit-distance heuristics) for human review.
- Optional: a small LLM pass (local or API) to propose fixes only for flagged rows, preserving original alongside suggestion.

4) Human-in-the-loop review
- Maintain a `review/dictionary_review.csv` (or a Google Sheet) with columns for original OCR, suggestion, final decision.
- After review, produce `data/dictionary.csv`.

5) Transform to site JSON
- Convert CSV → JSON in `data/dictionary.json` (or chunked files) for the site.
- Also generate `data/search-index.json` for MiniSearch/Lunr.

Outputs kept in repo for transparency and backups.

### Pages and content
- `content/index.md`: Homepage content (intro, highlights).
- `content/history.md`: Long-form history.
- `content/works/*.md`: Frontmatter with `title, type: audio|video|text, year, creators, url, description, tags`.
- `data/dictionary*.json`: Dictionary data.

### Project structure
```
.
├─ content/
│  ├─ index.md
│  ├─ history.md
│  └─ works/
│     └─ *.md
├─ data/
│  ├─ dictionary.json        # or dictionary-A.json, etc.
│  └─ search-index.json      # generated
├─ scripts/
│  ├─ ocr_pipeline.py        # PDF → CSV (raw), suggestions, review sheet
│  └─ build_index.mjs        # CSV/JSON → site JSON + MiniSearch index
├─ src/                      # Eleventy templates/layouts/assets
│  ├─ _data/
│  ├─ layouts/
│  ├─ pages/
│  └─ assets/
├─ .github/workflows/gh-pages.yml
├─ .eleventy.js
└─ package.json
```

### Deployment (GitHub Pages)
- GitHub Action builds Eleventy on `main` and publishes to `gh-pages` branch.
- No server, no database; content is the repo.

### Editing workflow (now)
- Edit Markdown/JSON directly in GitHub; PRs for review.
- For contributions, link a GitHub Issue template (word submission, corrections).
- Later: add Decap CMS (Git-based CMS) if browser editing is desired without PR flow.

### Improvements (lean, optional)
- Script toggle: show Devanagari/Roman; remember preference in `localStorage`.
- A–Z browse pages generated at build.
- Word-of-the-day: client-side pick from a deterministic seed.
- Download: nightly JSON snapshot kept in `data/exports/`.
- Accessibility: semantic HTML, keyboard navigation, high-contrast theme.

### Risks & mitigations
- OCR accuracy (esp. noisy scans, Takri): keep HOCR confidences, prioritize human review on flagged tokens; allow unknown POS.
- Search payload size: chunk dictionary, lazy-load index, prefer MiniSearch with field boosts.
- External media rot: mirror critical links in an out-of-band archive list for later ingestion.

### Initial task list
1) Set up Eleventy skeleton and GitHub Pages workflow.
2) Create content pages: `index.md`, `history.md`, `works/` examples.
3) Add dictionary UI: list + detail template; wire client search with a tiny index.
4) Implement `scripts/ocr_pipeline.py` (v1) to get `dictionary_raw.csv` from PDF.
5) Add rule-based cleanup + review CSV; convert to `data/dictionary.json`.
6) Generate `data/search-index.json` using `build_index.mjs`.
7) Ship MVP on GH Pages; iterate on search tuning and data quality.

### Minimal acceptance for MVP
- Homepage, History, Works pages render on GH Pages.
- Dictionary loads from static JSON, is searchable client-side, and has per-entry pages.
- OCR pipeline produces initial dataset; low-confidence items are flagged for review.



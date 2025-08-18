## Outer Siraji Preservation (Static Site)

A lean, static website for preserving and sharing the Outer Siraji (Pahari) language. It features a searchable dictionary, a history page, and a works section that embeds external audio/video. Built with Eleventy and deployed to GitHub Pages.

### Highlights
- Static, no database. Content lives in this repo.
- Dictionary sourced from a curated CSV (`mainDictionary.csv`).
- Client-side instant search with a small prebuilt index.
- External media embeds only for now (YouTube, Archive.org, etc.).
- GitHub Actions auto-builds and deploys on every push to `main`.

### Project structure
```
.
├─ content/                    # Future long-form content (optional)
├─ data/                       # Generated data for the site (JSON + index)
│  ├─ dictionary.json
│  └─ search-index.json
├─ review/                     # OCR/parse outputs for human review (optional)
├─ scripts/                    # Build helpers
│  ├─ csv_to_json.mjs          # mainDictionary.csv → data/dictionary.json
│  └─ build_index.mjs          # dictionary.json → data/search-index.json
├─ src/                        # Eleventy input
│  ├─ _includes/layouts/base.njk
│  ├─ assets/styles.css
│  ├─ dictionary/index.njk     # UI: search, list, detail dialog
│  ├─ history.njk
│  ├─ index.njk
│  └─ works/
│     ├─ index.njk
│     └─ example.md
├─ .eleventy.js                # Eleventy configuration (pathPrefix-aware)
├─ .github/workflows/gh-pages.yml
├─ mainDictionary.csv          # Primary data source (curated)
├─ package.json
└─ PLAN.md                     # High-level plan and roadmap
```

### Data model (concise)
`mainDictionary.csv` headers:
- `Word`, `Part_of_Speech`, `Etymology`, `Definition`, `Examples_and_Notes`, `Source_Page`

During build, rows become entries like:
```json
{
  "id": "manual-00001",
  "head": { "devanagari": "", "roman": "Word" },
  "pos": "Part_of_Speech",
  "etymology": "Etymology",
  "senses": [
    { "gloss_en": "Definition", "definition": "Definition", "examples": [{ "en": "Examples_and_Notes" }] }
  ],
  "sourcePage": "Source_Page"
}
```

### Local development
Requirements: Node.js 18+ (20 recommended), npm.

1) Install dependencies:
```
npm install
```
2) Build the site (converts CSV → JSON, builds search index, then Eleventy):
```
npm run build
```
3) Serve locally with auto-reload:
```
npm run dev
```
Open the URL shown (by default `http://localhost:8080/`).

### Editing data
- Edit `mainDictionary.csv` and commit. The GitHub Action will rebuild and deploy automatically.
- For local preview, run `npm run build` again after changes.

### Deployment (GitHub Pages)
- Push to `main` → Action builds and deploys to `gh-pages`.
- Custom domain: add a `CNAME` file at the repo root with your domain (e.g., `example.org`). The workflow detects it, sets `ELEVENTY_PATH_PREFIX=/`, and copies the `CNAME` into the published site.
- Project pages (no custom domain): links/data use `/${repo-name}/` as base automatically.

### Testing/checks (manual)
- Validate build succeeds: `npm run build` prints a summary.
- Sanity check dictionary UI: open `_site/dictionary/index.html` and try search/filters.
- Validate JSON data: `node -e "console.log(require('./data/dictionary.json').length)"`

### Roadmap (short)
- A–Z browse and jump headers.
- Script toggle (Devanagari/Roman; add Takri later).
- Works filters (type/year) and richer cards.
- Optional Decap CMS for Git-based editing.

### License
- Site code: MIT (unless noted otherwise).
- Content and data: see per-file attributions; some items may be public-domain or CC-licensed.



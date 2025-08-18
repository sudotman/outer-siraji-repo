## Outer Siraji Preservation (Static Site)

A lean, static website for preserving and sharing the Outer Siraji (Pahari) language. It features a searchable dictionary, a history page, and a works section that embeds external audio/video. Deployed to GitHub Pages.

### Highlights
- Static, no database. Content lives in this repo.
- Dictionary sourced from a curated CSV (`mainDictionary.csv`).
- Client-side instant search with a small prebuilt index.
- External media embeds only for now (YouTube, Archive.org, etc.).
- GitHub Actions auto-builds and deploys on every push to `main`.



### Data model (concise)
`mainDictionary.csv` headers:
- `Word`, `Part_of_Speech`, `Etymology`, `Definition`, `Examples_and_Notes`, `Source_Page`


### Editing data
- Edit `mainDictionary.csv` and commit. The GitHub Action will rebuild and deploy automatically.
- For local preview, run `npm run build` again after changes.

### Roadmap (short)
- A–Z browse and jump headers.
- Script toggle (Devanagari/Roman; add Takri later).
- Works filters (type/year) and richer cards.
- Optional Decap CMS for Git-based editing.

### License
- Site code: MIT (unless noted otherwise).
- Content and data: see per-file attributions; some items may be public-domain or CC-licensed.



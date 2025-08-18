## pahadi preservation

a lean, static website for preserving and sharing the beautiful pahadi language. it features a searchable dictionary, a history page, and a works section that embeds external audio/video. deployed to github pages.

## origin
it started off as an effort to preserver outer siraji (pahari) dialect of where I come from but then expanded to pahari in general.

uses:  https://archive.org/details/in.ernet.dli.2015.223292/page/n11/mode/2up

### highlights
- static, no database. content lives in this repo.
- dictionary sourced from a curated csv (`maindictionary.csv`).
- client-side instant search with a small prebuilt index.
- external media embeds only for now (youtube, archive.org, etc.).
- github actions auto-builds and deploys on every push to `main`.


### data model (concise)
`maindictionary.csv` headers:
- `word`, `part_of_speech`, `etymology`, `definition`, `examples_and_notes`, `source_page`


### editing data
- edit `maindictionary.csv` and commit. the github action will rebuild and deploy automatically.
- for local preview, run `npm run build` again after changes.

### roadmap (short)
- a–z browse and jump headers.
- script toggle (devanagari/roman; add takri later).
- works filters (type/year) and richer cards.
- optional decap cms for git-based editing.

### license
- site code: mit (unless noted otherwise).
- content and data: see per-file attributions; some items may be public-domain or cc-licensed.


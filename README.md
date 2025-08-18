## pahadi preservation

a lean, static website for preserving and sharing the beautiful pahadi language. it features a searchable dictionary, a history page, and a works section that embeds external audio/video. deployed to github pages.

## origin
it started off as an effort to preserver outer siraji (pahari) dialect of my hometown but then expanded to pahari in general since pahari is sadly not preserved well at all - with zero properly accesible records available onlone.

the main source of data is 'A Dictionary Of Pahari Dialects' published in 1909 by 'Himachal Academy of Arts Culture And Languages' who's scanned mirror was on [archive.org](https://archive.org/details/in.ernet.dli.2015.223292/page/n11/mode/2up).

the 1909 pahari dictionary, which is a compilation of various pahari dictionaries from the time is sadly one of the ONLY resources available online. we are in 2025 and there has been no effort to digitize pahari dictionaries or literature. foregoing this, pahari remains to be classified as definitely endangered - and yet, there is almost no effort to preserve it. this is necessary to preserve a unique himalayan culture that is embodied throughout the language. 

## process
regardless of the availability of the dictionary, the automatic OCR was unreliable and atmost produced garbled words. there was a lot of LLMs and manual work to get the data in a usable format. manual human oversight was done but for a project of this size, it might have produced some errors - feel free to fix them and make a pull request if needed. there could also have been some words which were missed altogether so ji bhaan, kora help.

## highlights
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
- for local preview, run `npm run build` again after changes - `npm run serve` to see the changes.


### roadmap (short)
- adding kinnauri data from the same source.
- categorizing the words by dialects [segregating bilaspuri, siraji, etc. as filters]
- script toggle (devanagari/roman; add takri later).
- works filters (type/year) and richer cards.
- optional decap cms for git-based editing.
- extracting folklores, proverbs. available in the source:
    - the main dictionary is from page 11 onwards and goes till page 130.
    - appendices (Folklore, Proverbs, Riddles, Songs) from page 131 onwards.
    - a Grammar and Dictionary of Kanwari (a completely separate work) from page 157 onwards.

### license
- site code: mit (unless noted otherwise).
- content and data: see per-file attributions; some items may be public-domain or cc-licensed.


Great — let’s take stock and make a clear, bite-sized plan (ELI5 style where helpful), plus practical options for displaying this on your website.

---

# What we’ve done so far (quick recap)
- Parsed your PDF into a CSV (`Kullui_converted.csv`) and parsed your original OG CSV into a normalized **new schema** CSV.  
- Repaired malformed rows and produced final converted files:
  - `/mnt/data/mainDictionary_converted_fixed_v2.csv` — OG → new schema conversion (4,128 rows).  
  - `/mnt/data/mainDictionary_with_pron.csv` — same as above **with** a first-pass pronunciation mapping applied (columns added: `pronunciation_ipa`, `pronunciation_deva`, `pron_confidence`, `pron_note`, `pron_token_sample`).  
  - I also split the large file into parts you can download:  
    `/mnt/data/mainDictionary_part1.csv`, `/mnt/data/mainDictionary_part2_a.csv`, `/mnt/data/mainDictionary_part2_b.csv`.  
  - `/mnt/data/pronunciation_mapping.csv` — the grapheme→IPA/Devanagari mapping table I created from your orthography notes.

(If you need direct download links again I can paste them, or you can use the file manager you already used.)

---

# What still needs to be done (prioritized)
1. **Improve the pronunciation mapping quality.** Right now only **8** rows were "high confidence" — most rows contain characters or sequences not yet covered by the mapping table.  
2. **Manual review & cleanup.** Fix rows flagged low-confidence (unmapped characters, punctuation, orthographic variants).  
3. **Decide display choices for your website** (how to show orthography, IPA, Devanagari, examples, audio).  
4. **Integration / search improvements** (fuzzy matching, normalized search, language filters).  
5. Optional/enhancements: add audio recordings, per-sense entries, export formats (JSON/SQLite/CLDF) and provenance tracking.

---

# ELI5: what the pronunciation mapping *is* and why it matters
- Your dictionary headwords are written in a particular orthography (special letters like `ā`, `ḍh`, `ṅ`, apostrophes, etc.). That orthography is fine for humans who know it, but computers and many readers benefit from a **standard phonetic representation**: **IPA** (International Phonetic Alphabet).  
- The mapping table (`pronunciation_mapping.csv`) tells the computer: “when you see the sequence `āṅ`, treat it like `aːŋ` in IPA and `आङ` in Devanagari.” We apply those rules across the headwords and produce `pronunciation_ipa` and `pronunciation_deva`.  
- **Why it matters:**
  - **Search:** users may search by pronunciation or expect similar spellings to match (sound-based search).  
  - **Display:** many users will prefer seeing IPA or Devanagari alongside the headword.  
  - **Audio:** IPA → can be matched to recordings or TTS later.  
- **Nuances to understand (simple):**
  - **Long vs short vowels:** `ā` means a longer “a” sound (`aː`) vs `a` short.  
  - **Nasalization vs final nasal consonant:** `āṅ` could mean a nasalized vowel (`ã`) or a vowel + velar nasal `ŋ`. The mapping must pick one or flag it as uncertain.  
  - **Retroflex vs dental:** `ḍ`, `ṭ`, `ɖ` are retroflex (tongue curled back) — different sound from plain `d`/`t`.  
  - **Aspirated stops:** `ḍh` or `dh` indicates aspiration (`ɖʱ` or `dʱ`) — like an extra puff of air.  
  - **Clusters and special markers:** apostrophes or diacritics sometimes mark glottal stops, palatalization, or morphological boundaries — they need rules.

---

# Does the converted file have a pronunciation mapping?
- **Yes —** `mainDictionary_with_pron.csv` already has `pronunciation_ipa` and `pronunciation_deva`.  
- **BUT:** most rows are `pron_confidence = "low"` because many headwords include characters/variants not covered by the small mapping table. That’s normal for a first pass. We can make it much better by adding more mapping tokens and some normalization rules.

---

# Best ways to display pronunciations and entries on your website (practical, non-linguist friendly)

### Display components for a single entry (recommended)
- **Headword line**:  
  - `headword` (large, bold) — show normalized search form as hover tooltip.  
  - Immediately under: small badges for `pos` (NOUN / VERB), `page` / `source`.
- **Pronunciation row** (toggleable):  
  - **IPA**: `pronunciation_ipa` (display in slashed or bracketed form — e.g., `/aːŋ/` or `[aːŋ]`).  
  - **Devanagari**: `pronunciation_deva` (if available) — helpful for local readers.  
  - **Confidence indicator**: small icon or color dot (green high, amber low). Tooltip: `Mapping confidence: low — check unmapped chars: ...`  
- **Orthography token map** (optional, nice UX): show the headword segmented into graphemes; hover any grapheme to show the mapping (orth → IPA + Deva). Great teaching tool for learners.
- **Definition(s)**: `gloss_en`, numbered `senses` if present.  
- **Examples**: `examples` (with any source/page).  
- **Etymology**: `etymology` (smaller / collapsed by default).  
- **Play audio** (future): small play button if an audio file exists (filename like `id_1234.wav`).

### Entry list / search results UX
- Compact lines: `headword — gloss_en — pos — [ipa]`  
- **Autosuggest**: show IPA/Devanagari alternatives in suggestions (e.g., user types “aang” show `āṅ (aːŋ)`).
- Filters: POS, `pron_confidence`, source (PDF vs OG), language of gloss (en/ru).

---

# Ways to implement on your website (pick depending on your stack)

### A — Quick / no server changes: static + client search
- **How:** host CSV/JSON and use client-side JS lib like **Fuse.js** for fuzzy search.  
- **Pros:** simple, no backend changes.  
- **Cons:** large data may be slow on low-end devices; limited scalability.
- **Files to serve:** convert CSV → JSON (one file or chunked files you already have). Provide endpoints or static asset URLs.

### B — Small backend + API (recommended for medium scale)
- **How:** import CSV into a small DB (SQLite / PostgreSQL). Expose a `/search?q=` and `/entry/{id}` REST API. Do server-side normalization (strip diacritics) so search matches orthography variants.  
- **Pros:** fast, scalable, can implement ranked/fuzzy search with trigram or full-text search.  
- **Tech:** any back end you already have (Node/Express, Python/Flask, Ruby/Rails). Use Postgres `pg_trgm` for fuzzy search.

### C — Full search engine (Elasticsearch / Meilisearch)
- **How:** index entries into ES or Meilisearch — great for faceted search, typo tolerance, and instant suggestions.  
- **Pros:** very good search UX, language support.  
- **Cons:** extra infra.

### Storage/format suggestions
- Keep canonical source as **CSV** and also export a **JSON** or **SQLite** for your website. JSON is easiest for client-side; SQLite/DB for server-side.

---

# Concrete steps to show IPA/Devanagari and improve mapping (I’ll do these for you if you want)

**Immediate (fast)**  
1. Use `mainDictionary_with_pron.csv` to show `pronunciation_ipa` and `pronunciation_deva` on entry pages — show a confidence dot (low/high).  
2. Add a small “Teach me” popover with the grapheme map (the mapping table is already available as `/mnt/data/pronunciation_mapping.csv`).

**Improve mapping (recommended)**  
1. **Normalize headwords**: replace curly quotes, unify apostrophes, normalize Unicode combining marks, collapse common diacritics variants.  
2. **Expand mapping tokens**: add tokens that appear in low-confidence rows (we can compute a frequency list of unmapped characters).  
3. Re-run mapping; confidence will increase quickly.  
4. Manually check remaining low-confidence headwords (maybe 200–500) — doable in a short review session.

**Optional but very valuable**  
- **Record audio** for most common words (or crowdsource recordings). Host files named by `id` and show a play button next to IPA. This makes the dictionary approachable for learners.

---

# How to display pronunciation (design ideas, ELI5)
1. **Two-line header (minimal):**  
   - Line 1: `Headword` (big)  
   - Line 2: `/aːŋ/ · आङ` (IPA first, Devanagari second; show IPA in slashes or brackets)
2. **Hover segmentation:** user hovers `āṅ` and a tiny tooltip shows: `āṅ → aːŋ (Deva: आङ)`.  
3. **Confidence**: a small colored dot: green = auto-mapped & checked; yellow = mapped but check; red = unmapped. Clicking the dot gives `pron_note` details.  
4. **Learner mode toggle:** show IPA + audio + grapheme mapping. For casual users, show only Devanagari or none.

---

# File status & what I can run for you now (pick one or more; I’ll run immediately)
1. **Generate a prioritized list** of unmapped characters / graphemes and sample headwords (so we know which mapping tokens to add). — *I recommend doing this first.*  
2. **Add normalization rules** (e.g., unify apostrophes, strip zero-width) and re-run mapping (should bump confidence).  
3. **Expand mapping table**: I can auto-propose new mapping entries from the unmapped character list — I’ll create a draft `pronunciation_mapping_v2.csv` for your review.  
4. **Prepare website-ready JSON** (split files) for you to drop into your site (e.g., small JSON chunks for client search).  
5. **Implement a simple example UI snippet** (vanilla JS + Fuse.js) showing search + entry display with IPA/Deva toggle. I can give copy-paste code.

---

# Short example: how an entry could look in HTML (vanilla, tiny)
Paste into your site to show headword + IPA toggle. (You can adapt to your framework.)

```html
<div class="entry">
  <h1 id="head">Āṅa</h1>
  <div class="meta">
    <span class="pos">NOUN</span>
    <span class="page">p. 12</span>
  </div>

  <div class="pron">
    <button id="togglePron">Show IPA</button>
    <span id="ipa" style="display:none">/aːŋ/</span>
    <span id="deva" style="margin-left:8px">आङ</span>
    <span class="confidence" title="low confidence" style="color:orange">●</span>
  </div>

  <div class="definition">
    <strong>Meaning:</strong> small coin (gloss_en)
  </div>
  <div class="examples"><em>Example:</em> ...</div>
</div>

<script>
document.getElementById('togglePron').onclick = () => {
  const ipa = document.getElementById('ipa');
  ipa.style.display = ipa.style.display === 'none' ? 'inline' : 'none';
}
</script>
```

---

# Final recommendation & next step I strongly suggest
1. **Generate the unmapped-character frequency report** (so we can safely expand the mapping table). I can create it now and show the top 50 problematic sequences with examples.  
2. After you approve adding new mappings (or tweaking some rules), we re-run mapping and then export a clean JSON for your site and optionally add audio placeholders.

Which of the actions above would you like me to run right now? (I recommend the unmapped-character report as step 1 and I can produce it immediately.)

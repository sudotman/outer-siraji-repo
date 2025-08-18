#!/usr/bin/env node
import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { parse } from 'csv-parse/sync';
import lunr from 'lunr';

const ROOT = path.resolve(process.cwd());
const INPUT_CSV = path.join(ROOT, 'mainDictionary.csv');
const PUBLIC_DIR = path.join(ROOT, 'public');
const DATA_DIR = path.join(PUBLIC_DIR, 'data');
const ASSETS_DIR = path.join(PUBLIC_DIR, 'assets');

async function ensureDir(dirPath) {
  if (!existsSync(dirPath)) {
    await mkdir(dirPath, { recursive: true });
  }
}

function normalizeString(value) {
  if (value == null) return '';
  return String(value).replace(/\r\n?|\n/g, ' ').trim();
}

async function loadCsv() {
  const csv = await readFile(INPUT_CSV, 'utf8');
  const rows = parse(csv, {
    columns: false,
    skip_empty_lines: true,
    relax_column_count: true,
    relax_quotes: true,
    trim: true
  });
  const entries = [];
  for (let i = 0; i < rows.length; i++) {
    const cols = rows[i];
    // Skip header row if present
    if (i === 0 && cols[0] && String(cols[0]).toLowerCase() === 'word') continue;
    if (!cols || cols.length < 2) continue;

    const word = normalizeString(cols[0]);
    const pos = normalizeString(cols[1]);
    const ety = normalizeString(cols[2]);
    const defn = normalizeString(cols[3]);
    // All columns except the last (page) from index 4 onward are folded into notes
    let sourcePage = '';
    let notes = '';
    if (cols.length >= 6) {
      sourcePage = normalizeString(cols[cols.length - 1]);
      const extraNotes = cols.slice(4, cols.length - 1).map(normalizeString).filter(Boolean);
      notes = [normalizeString(cols[4] || ''), ...extraNotes].filter(Boolean).join(' | ');
    } else {
      notes = normalizeString(cols[4] || '');
    }

    entries.push({
      id: entries.length + 1,
      Word: word,
      Part_of_Speech: pos,
      Etymology: ety,
      Definition: defn,
      Examples_and_Notes: notes,
      Source_Page: sourcePage
    });
  }
  return entries;
}

function buildIndex(entries) {
  const builder = new lunr.Builder();
  builder.ref('id');
  builder.field('Word');
  builder.field('Definition');
  builder.field('Examples_and_Notes');
  builder.field('Etymology');
  builder.field('Part_of_Speech');

  for (const entry of entries) {
    builder.add(entry);
  }
  return builder.build();
}

function toAZBuckets(entries) {
  const map = new Map();
  for (const entry of entries) {
    const initial = (entry.Word || '').trim()[0]?.toUpperCase() || '#';
    const key = /[A-ZÁÉÍÓÚÄËÏÖÜÃÕÂÊÎÔÛ]/i.test(initial) ? initial : '#';
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(entry);
  }
  for (const list of map.values()) {
    list.sort((a, b) => a.Word.localeCompare(b.Word));
  }
  return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
}

async function writeJSON(filePath, data) {
  await writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
}

async function writeIndexHtml(entries) {
  const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Outer Siraji Preservation</title>
    <link rel="stylesheet" href="./assets/styles.css" />
  </head>
  <body>
    <header class="site-header">
      <h1>Outer Siraji (Pahari)</h1>
      <nav>
        <a href="./index.html" aria-current="page">Home</a>
        <a href="./dictionary/index.html">Dictionary</a>
        <a href="./works/index.html">Works</a>
        <a href="https://github.com/" target="_blank" rel="noopener">Contribute</a>
      </nav>
    </header>
    <main class="container">
      <section class="hero">
        <h2>Preserving language and culture</h2>
        <p>Search the dictionary or browse works. Data comes from <code>mainDictionary.csv</code>.</p>
        <div class="search">
          <input id="q" type="search" placeholder="Search words, definitions…" autofocus />
        </div>
        <div id="results" class="results"></div>
      </section>
    </main>
    <script type="module" src="./assets/search.js"></script>
  </body>
</html>`;
  await writeFile(path.join(PUBLIC_DIR, 'index.html'), html, 'utf8');
}

async function writeDictionaryHtml(entries) {
  const buckets = toAZBuckets(entries);
  const letters = buckets.map(([k]) => k).join('');
  const nav = buckets
    .map(([k]) => `<a href="#sec-${k}">${k}</a>`) 
    .join(' ');

  let sections = '';
  for (const [k, list] of buckets) {
    const items = list
      .map(
        (e) => `<article class="entry">
  <h3 id="w-${e.id}">${e.Word} <small>${e.Part_of_Speech}</small></h3>
  <p class="def">${e.Definition || ''}</p>
  ${e.Examples_and_Notes ? `<p class="ex">${e.Examples_and_Notes}</p>` : ''}
  ${e.Etymology ? `<p class="ety"><b>Etymology:</b> ${e.Etymology}</p>` : ''}
</article>`
      )
      .join('\n');
    sections += `\n<section class="letter" id="sec-${k}">\n  <h2>${k}</h2>\n  ${items}\n</section>\n`;
  }

  const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Dictionary · Outer Siraji</title>
    <link rel="stylesheet" href="../assets/styles.css" />
  </head>
  <body>
    <header class="site-header">
      <h1><a href="../index.html">Outer Siraji</a> · Dictionary</h1>
      <nav>
        <a href="../index.html">Home</a>
        <a href="./index.html" aria-current="page">Dictionary</a>
        <a href="../works/index.html">Works</a>
      </nav>
    </header>
    <main class="container">
      <section class="search">
        <input id="q" type="search" placeholder="Search words, definitions…" />
        <div id="results" class="results"></div>
      </section>
      <div class="az-nav">${nav}</div>
      ${sections}
    </main>
    <script type="module" src="../assets/search.js"></script>
  </body>
  </html>`;
  await ensureDir(path.join(PUBLIC_DIR, 'dictionary'));
  await writeFile(path.join(PUBLIC_DIR, 'dictionary', 'index.html'), html, 'utf8');
}

async function writeWorksHtml() {
  const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Works · Outer Siraji</title>
    <link rel="stylesheet" href="../assets/styles.css" />
  </head>
  <body>
    <header class="site-header">
      <h1><a href="../index.html">Outer Siraji</a> · Works</h1>
      <nav>
        <a href="../index.html">Home</a>
        <a href="../dictionary/index.html">Dictionary</a>
        <a href="./index.html" aria-current="page">Works</a>
      </nav>
    </header>
    <main class="container">
      <p>Embed external audio/video that document the language.</p>
      <div class="card-grid">
        <article class="card">
          <h3>Song: Example</h3>
          <div class="media">
            <iframe width="560" height="315" src="https://www.youtube.com/embed/dQw4w9WgXcQ" title="YouTube video" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
          </div>
          <p>Replace with community media links (YouTube, Archive.org, etc.).</p>
        </article>
      </div>
    </main>
  </body>
  </html>`;
  await ensureDir(path.join(PUBLIC_DIR, 'works'));
  await writeFile(path.join(PUBLIC_DIR, 'works', 'index.html'), html, 'utf8');
}

async function writeAssets() {
  await ensureDir(ASSETS_DIR);
  const css = `:root{--bg:#0f172a;--panel:#111827;--text:#e5e7eb;--muted:#9ca3af;--accent:#22d3ee}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--text);font:16px system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Cantarell,Noto Sans,sans-serif}
.site-header{display:flex;gap:1rem;align-items:center;justify-content:space-between;padding:1rem;border-bottom:1px solid #1f2937}
.site-header nav a{color:var(--muted);text-decoration:none;margin-right:1rem}
.site-header nav a[aria-current="page"],.site-header nav a:hover{color:var(--text)}
.container{max-width:960px;margin:0 auto;padding:1rem}
.hero{padding:2rem 0}
input[type=search]{width:100%;padding:.75rem 1rem;border-radius:.5rem;border:1px solid #334155;background:#0b1220;color:var(--text)}
.results{margin-top:1rem;display:grid;gap:.75rem}
.result{padding:1rem;border:1px solid #1f2937;border-radius:.5rem;background:var(--panel)}
.result .word{font-weight:600}
.result .pos{color:var(--muted)}
.letter{margin-top:2rem}
.letter h2{color:var(--accent)}
.entry{padding:1rem;border:1px solid #1f2937;border-radius:.5rem;background:var(--panel);margin:.75rem 0}
.entry h3{margin:.25rem 0 .5rem 0}
.def{margin:.25rem 0}
.ex,.ety{color:var(--muted);margin:.25rem 0}
.az-nav{display:flex;flex-wrap:wrap;gap:.25rem;margin:1rem 0}
.az-nav a{color:var(--muted);text-decoration:none;padding:.25rem .5rem;border:1px solid #1f2937;border-radius:.25rem}
.card-grid{display:grid;gap:1rem;grid-template-columns:repeat(auto-fit,minmax(280px,1fr))}
.card{background:var(--panel);border:1px solid #1f2937;padding:1rem;border-radius:.5rem}
code{background:#0b1220;padding:.15rem .35rem;border-radius:.25rem}
`;
  const searchJsLines = [
    "import lunr from 'https://cdn.jsdelivr.net/npm/lunr/+esm';",
    '',
    'const q = document.getElementById(\'q\');',
    'const resultsEl = document.getElementById(\'results\');',
    'let idx, docs;',
    '',
    "const base = (location.pathname.includes('/dictionary/') || location.pathname.includes('/works/')) ? '..' : '.';",
    '',
    'async function loadData() {',
    "  const [idxRes, dictRes] = await Promise.all([",
    "    fetch(base + '/data/search-index.json').then(r=>r.json()),",
    "    fetch(base + '/data/dictionary.json').then(r=>r.json())",
    '  ]);',
    '  idx = lunr.Index.load(idxRes);',
    '  docs = new Map(dictRes.entries.map(e => [String(e.id), e]));',
    '}',
    '',
    'function render(items) {',
    '  resultsEl.innerHTML = items.map(function(item){',
    '    const e = item.doc;',
    '    return \'<div class="result">\' +',
    '      \'<div class="word">\' + e.Word + \' <span class="pos">\' + (e.Part_of_Speech||\'\') + \'</span></div>\' +',
    '      \'<div class="def">\' + (e.Definition||\'\') + \'</div>\' +',
    '      (e.Examples_and_Notes ? \'<div class="ex">\' + e.Examples_and_Notes + \'</div>\' : \'\') +',
    "    '</div>';",
    '  }).join(\'\');',
    '}',
    '',
    'function onSearch() {',
    '  const term = q.value.trim();',
    "  if (!term) { resultsEl.innerHTML=''; return; }",
    '  const hits = idx.search(term).slice(0, 25);',
    '  const items = hits.map(function(h){ return { score: h.score, doc: docs.get(h.ref) }; }).filter(Boolean);',
    '  render(items);',
    '}',
    '',
    'loadData();',
    "q && q.addEventListener('input', onSearch);",
  ];
  const searchJs = searchJsLines.join('\n');
  await writeFile(path.join(ASSETS_DIR, 'styles.css'), css, 'utf8');
  await writeFile(path.join(ASSETS_DIR, 'search.js'), searchJs, 'utf8');
}

async function writeMetadata(entries) {
  const meta = {
    generatedAt: new Date().toISOString(),
    numEntries: entries.length,
    source: 'mainDictionary.csv'
  };
  await writeJSON(path.join(DATA_DIR, 'metadata.json'), meta);
}

async function main() {
  await ensureDir(PUBLIC_DIR);
  await ensureDir(DATA_DIR);
  await ensureDir(ASSETS_DIR);

  const entries = await loadCsv();
  // Persist data
  await writeJSON(path.join(DATA_DIR, 'dictionary.json'), { entries });

  // Build and persist index
  const idx = buildIndex(entries);
  await writeJSON(path.join(DATA_DIR, 'search-index.json'), idx.toJSON());
  await writeMetadata(entries);

  // Pages and assets
  await writeAssets();
  await writeIndexHtml(entries);
  await writeDictionaryHtml(entries);
  await writeWorksHtml();
  await writeFile(path.join(PUBLIC_DIR, '.nojekyll'), '');

  // Optional: if landingPageSample.html exists, copy to public/landing-sample.html
  const sample = path.join(ROOT, 'landingPageSample.html');
  if (existsSync(sample)) {
    await copyFile(sample, path.join(PUBLIC_DIR, 'landing-sample.html'));
  }

  console.log(`Build complete. ${entries.length} entries.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});



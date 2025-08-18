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
const CUSTOM_DOMAIN = process.env.CUSTOM_DOMAIN;

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
        <a href="./research/index.html">Research</a>
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
          <div class="search-controls"><label><input type="checkbox" id="charMode" /> Character match (min 3 chars)</label></div>
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
        <a href="../research/index.html">Research</a>
        <a href="../works/index.html">Works</a>
      </nav>
    </header>
    <main class="container">
      <section class="search">
        <input id="q" type="search" placeholder="Search words, definitions…" />
        <div class="search-controls"><label><input type="checkbox" id="charMode" /> Character match (min 3 chars)</label></div>
        <div id="results" class="results"></div>
      </section>
      <div class="az-nav">${nav}</div>
      ${sections}
    </main>
    <nav class="az-float" aria-label="Jump to letter">
      ${buckets.map(([k]) => `<a href="#sec-${k}">${k}</a>`).join('')}
    </nav>
    <script>
      (function(){
        const f = document.querySelector('.az-float');
        function onScroll(){ if(!f) return; f.classList.toggle('show', window.scrollY > 240); }
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
      })();
    </script>
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
        <a href="../research/index.html">Research</a>
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

async function writeResearchHtml() {
  const researchDir = path.join(PUBLIC_DIR, 'research');
  await ensureDir(researchDir);
  const contentDir = path.join(ROOT, 'content');
  await ensureDir(contentDir);
  const researchSource = path.join(contentDir, 'research.html');

  let articleHtml = '';
  if (existsSync(researchSource)) {
    articleHtml = await readFile(researchSource, 'utf8');
  } else {
    // One-time migration: try to extract from landingPageSample.html
    const sample = path.join(ROOT, 'landingPageSample.html');
    if (existsSync(sample)) {
      const content = await readFile(sample, 'utf8');
      const startIdx = content.indexOf('<article');
      const endIdx = content.indexOf('</article>');
      if (startIdx !== -1 && endIdx !== -1) {
        articleHtml = content.slice(startIdx, endIdx + '</article>'.length);
      }
    }
    if (!articleHtml) {
      articleHtml = '<article><h2>Outer Siraji Research</h2><p>Add your research content in content/research.html.</p></article>';
    }
    await writeFile(researchSource, articleHtml, 'utf8');
  }

  const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Outer Siraji Research</title>
    <link rel="stylesheet" href="../assets/styles.css" />
  </head>
  <body>
    <header class="site-header">
      <h1><a href="../index.html">Outer Siraji</a> · Research</h1>
      <nav>
        <a href="../index.html">Home</a>
        <a href="../dictionary/index.html">Dictionary</a>
        <a href="./index.html" aria-current="page">Research</a>
        <a href="../works/index.html">Works</a>
      </nav>
    </header>
    <main class="container">
      <h2>Outer Siraji Research</h2>
      <div class="prose-custom">
        ${articleHtml}
      </div>
    </main>
  </body>
  </html>`;
  await writeFile(path.join(researchDir, 'index.html'), html, 'utf8');
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
.search-controls{margin-top:.5rem;color:var(--muted);font-size:.9rem}
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
.az-float{position:fixed;right:12px;top:80px;display:none;flex-direction:column;gap:4px;background:rgba(17,24,39,.6);backdrop-filter:saturate(120%) blur(6px);padding:6px;border-radius:8px;border:1px solid #1f2937;max-height:80vh;overflow:auto}
.az-float.show{display:flex}
.az-float a{color:#cbd5e1;text-decoration:none;font-size:12px;padding:2px 6px;border-radius:4px}
.az-float a:hover{background:rgba(34,211,238,.15)}
.prose-custom{color:#cbd5e1}
.prose-custom h1,.prose-custom h2,.prose-custom h3,.prose-custom h4{color:#e5e7eb;margin:1.25rem 0 .5rem;font-weight:700}
.prose-custom p{line-height:1.75;margin:.75rem 0}
.prose-custom ul{padding-left:1.25rem;margin:.75rem 0}
.prose-custom li{margin:.25rem 0}
.prose-custom table{width:100%;border-collapse:collapse;margin:1rem 0}
.prose-custom th,.prose-custom td{border:1px solid #334155;padding:.5rem;text-align:left}
.prose-custom th{background:#0b1220}
.prose-custom code{background:#0b1220;padding:.1rem .25rem;border-radius:.25rem}
.card-grid{display:grid;gap:1rem;grid-template-columns:repeat(auto-fit,minmax(280px,1fr))}
.card{background:var(--panel);border:1px solid #1f2937;padding:1rem;border-radius:.5rem}
code{background:#0b1220;padding:.15rem .35rem;border-radius:.25rem}
`;
  const searchJsLines = [
    "import lunr from 'https://cdn.jsdelivr.net/npm/lunr/+esm';",
    '',
    'const q = document.getElementById(\'q\');',
    'const charMode = document.getElementById(\'charMode\');',
    'const resultsEl = document.getElementById(\'results\');',
    'let idx, docs;',
    '',
    "const base = (location.pathname.includes('/dictionary/') || location.pathname.includes('/works/') || location.pathname.includes('/research/')) ? '..' : '.';",
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
    '  if (charMode && charMode.checked) {',
    '    if (term.length < 3) { resultsEl.innerHTML = \'<div class="result">Type at least 3 characters for character match.</div>\'; return; }',
    '    const low = term.toLowerCase();',
    '    const out = [];',
    '    for (const e of docs.values()) {',
    '      const hay = (e.Word + " " + (e.Definition||"") + " " + (e.Examples_and_Notes||"")).toLowerCase();',
    '      if (hay.includes(low)) out.push({ score: 1, doc: e });',
    '      if (out.length >= 50) break;',
    '    }',
    '    render(out);',
    '    return;',
    '  }',
    '  const hits = idx.search(term).slice(0, 25);',
    '  const items = hits.map(function(h){ return { score: h.score, doc: docs.get(h.ref) }; }).filter(Boolean);',
    '  render(items);',
    '}',
    '',
    'loadData();',
    "q && q.addEventListener('input', onSearch);",
    "charMode && charMode.addEventListener('change', onSearch);",
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
  await writeResearchHtml();
  await writeFile(path.join(PUBLIC_DIR, '.nojekyll'), '');
  // Handle CNAME for custom domain
  const rootCname = path.join(ROOT, 'CNAME');
  if (existsSync(rootCname)) {
    await copyFile(rootCname, path.join(PUBLIC_DIR, 'CNAME'));
  } else if (CUSTOM_DOMAIN) {
    await writeFile(path.join(PUBLIC_DIR, 'CNAME'), CUSTOM_DOMAIN.trim() + '\n');
  }

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



#!/usr/bin/env node
import { readFile, writeFile, mkdir, copyFile, readdir } from 'node:fs/promises';
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
    <title>pahari preservation</title>
    <link rel="stylesheet" href="./assets/styles.css" />
  </head>
  <body>
    <header class="site-header">
      <h1>pahari preservation</h1>
      <nav>
        <a href="./index.html" aria-current="page">Home</a>
        <a href="./dictionary/index.html">Dictionary</a>
        <a href="./research/index.html">Research</a>
        <a href="./appendix/index.html">Appendix</a>
        <a href="./works/index.html">Works</a>
        <a href="https://github.com/sudotman/outer-siraji-repo" target="_blank" rel="noopener">Contribute</a>
      </nav>
    </header>
    <main class="container">
      <section class="hero">
        <h2>Preserving language and culture</h2>
        <p>Search the dictionary or browse works. Have fun exploring this beautiful language and culture.</p>
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
    <title>Dictionary · pahari</title>
    <link rel="stylesheet" href="../assets/styles.css" />
  </head>
  <body>
    <header class="site-header">
      <h1><a href="../index.html">pahari</a> · dictionary</h1>
      <nav>
        <a href="../index.html">Home</a>
        <a href="./index.html" aria-current="page">Dictionary</a>
        <a href="../research/index.html">Research</a>
        <a href="../appendix/index.html">Appendix</a>
        <a href="../works/index.html">Works</a>
        <a href="https://github.com/sudotman/outer-siraji-repo" target="_blank" rel="noopener">Contribute</a>
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
  const worksPublicDir = path.join(PUBLIC_DIR, 'works');
  await ensureDir(worksPublicDir);
  const contentDir = path.join(ROOT, 'content');
  await ensureDir(contentDir);
  const worksContentDir = path.join(contentDir, 'works');
  await ensureDir(worksContentDir);

  const configPath = path.join(worksContentDir, 'index.json');
  let config;
  if (existsSync(configPath)) {
    try {
      config = JSON.parse(await readFile(configPath, 'utf8'));
    } catch {
      config = { topics: [] };
    }
  } else {
    // Bootstrap default topic and item from legacy static page
    const defaultItems = [
      {
        type: 'Video',
        title: 'Song: Example',
        embed_url: 'https://www.youtube.com/embed/1EpCq8YzX8Y',
        description: 'Replace with community media links (YouTube, Archive.org, etc.).'
      }
    ];
    await ensureDir(path.join(worksContentDir, 'general'));
    await writeFile(path.join(worksContentDir, 'general', 'items.json'), JSON.stringify(defaultItems, null, 2), 'utf8');
    config = {
      topics: [
        {
          id: 'general',
          title: 'General',
          description: 'Uncategorized media documenting the language.'
        }
      ]
    };
    await writeFile(configPath, JSON.stringify(config, null, 2), 'utf8');
  }

  const topics = Array.isArray(config?.topics) ? config.topics : [];

  // Write per-topic pages and copy datasets
  for (const t of topics) {
    const id = String(t.id || 'general');
    const topicPublicDir = path.join(worksPublicDir, id);
    await ensureDir(topicPublicDir);
    // Data file path
    const itemsA = path.join(worksContentDir, id, 'items.json');
    const itemsB = path.join(worksContentDir, `${id}.json`);
    const raw = await readFile(existsSync(itemsA) ? itemsA : itemsB, 'utf8').catch(() => '[]');
    await writeFile(path.join(DATA_DIR, `works-${id}.json`), raw, 'utf8');

    const pageHtml = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${t.title || id} · Works · pahari</title>
    <link rel="stylesheet" href="../../assets/styles.css" />
  </head>
  <body>
    <header class="site-header">
      <h1><a href="../../index.html">pahari</a> · Works · ${t.title || id}</h1>
      <nav>
        <a href="../../index.html">Home</a>
        <a href="../../dictionary/index.html">Dictionary</a>
        <a href="../../research/index.html">Research</a>
        <a href="../../appendix/index.html">Appendix</a>
        <a href="../index.html" aria-current="page">Works</a>
        <a href="https://github.com/sudotman/outer-siraji-repo" target="_blank" rel="noopener">Contribute</a>
      </nav>
    </header>
    <main class="container">
      <section class="hero">
        <h2>${t.title || id}</h2>
        <p>${t.description || ''}</p>
        <input id="works-search" type="search" placeholder="Search media… (title, description)" />
        <div id="works-filters" class="chip-row" aria-label="Filter by type"></div>
      </section>
      <div id="works-grid" class="card-grid"></div>
    </main>
    <script>window.WORKS_FILE = 'works-${id}.json';</script>
    <script type="module" src="../../assets/works.js"></script>
  </body>
  </html>`;
    await writeFile(path.join(topicPublicDir, 'index.html'), pageHtml, 'utf8');
  }

  // Hub page
  const cards = topics
    .map((t) => `<article class="card"><h3>${t.title || t.id}</h3><p>${t.description || ''}</p><p><a class="chip" href="./${t.id}/index.html">Open</a></p></article>`)
    .join('\n');

  const hubHtml = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Works · pahari</title>
    <link rel="stylesheet" href="../assets/styles.css" />
  </head>
  <body>
    <header class="site-header">
      <h1><a href="../index.html">pahari</a> · Works</h1>
      <nav>
        <a href="../index.html">Home</a>
        <a href="../dictionary/index.html">Dictionary</a>
        <a href="../research/index.html">Research</a>
        <a href="../appendix/index.html">Appendix</a>
        <a href="./index.html" aria-current="page">Works</a>
        <a href="https://github.com/sudotman/outer-siraji-repo" target="_blank" rel="noopener">Contribute</a>
      </nav>
    </header>
    <main class="container">
      <section class="hero">
        <h2>Media collections</h2>
        <p>Browse audio, video, and other media by topic.</p>
      </section>
      <div class="card-grid">${cards}</div>
    </main>
  </body>
  </html>`;
  await writeFile(path.join(worksPublicDir, 'index.html'), hubHtml, 'utf8');
}

async function writeResearchHtml() {
  // New research hub with per-topic pages
  const researchPublicDir = path.join(PUBLIC_DIR, 'research');
  await ensureDir(researchPublicDir);
  const contentDir = path.join(ROOT, 'content');
  await ensureDir(contentDir);
  const researchContentDir = path.join(contentDir, 'research');
  await ensureDir(researchContentDir);

  // Helper to make a safe slug
  function slugify(s) {
    return (
      String(s || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'topic'
    );
  }

  // Load or create research config
  const configPath = path.join(researchContentDir, 'index.json');
  let config;
  if (existsSync(configPath)) {
    try {
      const raw = await readFile(configPath, 'utf8');
      config = JSON.parse(raw);
    } catch {
      config = { topics: [] };
    }
  } else {
    // Bootstrap from legacy content/research.html if present
    const legacy = path.join(contentDir, 'research.html');
    let legacyHtml = '';
    if (existsSync(legacy)) {
      legacyHtml = await readFile(legacy, 'utf8');
    } else {
      // Fallback: attempt extraction from landing sample
      const sample = path.join(ROOT, 'landingPageSample.html');
      if (existsSync(sample)) {
        const content = await readFile(sample, 'utf8');
        const startIdx = content.indexOf('<article');
        const endIdx = content.indexOf('</article>');
        if (startIdx !== -1 && endIdx !== -1) {
          legacyHtml = content.slice(startIdx, endIdx + '</article>'.length);
        }
      }
    }
    if (!legacyHtml) {
      legacyHtml = '<article><h2>Outer Siraji — Research</h2><p>Add your research content in content/research/outer-siraji/index.html.</p></article>';
    }
    const defaultTopicDir = path.join(researchContentDir, 'outer-siraji');
    await ensureDir(defaultTopicDir);
    await writeFile(path.join(defaultTopicDir, 'index.html'), legacyHtml, 'utf8');
    config = {
      topics: [
        {
          id: 'outer-siraji',
          title: 'Outer Siraji',
          description: 'A linguistic and sociolinguistic profile with maps and references.',
          hero: 'assets/outerSirajiSelection.jpeg'
        }
      ]
    };
    await writeFile(configPath, JSON.stringify(config, null, 2), 'utf8');
  }

  // Normalize topics list, discover titles if missing
  const topics = Array.isArray(config?.topics) ? config.topics : [];
  for (const t of topics) {
    t.id = slugify(t.id || t.title);
    // Ensure source html exists
    const htmlDir = path.join(researchContentDir, t.id);
    const htmlPathA = path.join(htmlDir, 'index.html');
    const htmlPathB = path.join(researchContentDir, `${t.id}.html`);
    let htmlExists = existsSync(htmlPathA) || existsSync(htmlPathB);
    if (!htmlExists) {
      const placeholder = `<article><h2>${t.title || 'Research'}</h2><p>Write content at content/research/${t.id}/index.html.</p></article>`;
      await ensureDir(htmlDir);
      await writeFile(htmlPathA, placeholder, 'utf8');
      htmlExists = true;
    }
    // Derive title/summary from HTML if not provided
    try {
      const htmlPath = existsSync(htmlPathA) ? htmlPathA : htmlPathB;
      const raw = await readFile(htmlPath, 'utf8');
      if (!t.title) {
        const m = raw.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || raw.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i);
        t.title = m ? String(m[1]).replace(/<[^>]+>/g, '').trim() : t.id;
      }
      if (!t.description) {
        const p = raw.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
        t.description = p ? String(p[1]).replace(/<[^>]+>/g, '').trim().slice(0, 200) : '';
      }
    } catch {}
  }

  // Helper: copy hero/asset to topic public folder
  async function copyHeroIfPresent(topic) {
    if (!topic.hero) return null;
    const topicPublicDir = path.join(researchPublicDir, topic.id);
    const dest = path.join(topicPublicDir, topic.hero);
    const destDir = path.dirname(dest);
    await ensureDir(destDir);
    const candidates = [
      path.join(researchContentDir, topic.id, topic.hero),
      path.join(ROOT, path.basename(topic.hero))
    ];
    for (const src of candidates) {
      if (existsSync(src)) {
        await copyFile(src, dest);
        return dest;
      }
    }
    return null;
  }

  // Helper: copy all files from content/research/<id>/assets to public/research/<id>/assets
  async function copyAssetsDir(topicId) {
    const srcDir = path.join(researchContentDir, topicId, 'assets');
    if (!existsSync(srcDir)) return [];
    const dstDir = path.join(researchPublicDir, topicId, 'assets');
    await ensureDir(dstDir);
    const files = await readdir(srcDir);
    const out = [];
    for (const f of files) {
      const s = path.join(srcDir, f);
      const d = path.join(dstDir, f);
      await copyFile(s, d);
      out.push(`assets/${f}`);
    }
    return out;
  }

  // Build topic pages
  for (const topic of topics) {
    const htmlPath = existsSync(path.join(researchContentDir, topic.id, 'index.html'))
      ? path.join(researchContentDir, topic.id, 'index.html')
      : path.join(researchContentDir, `${topic.id}.html`);
    const articleHtml = await readFile(htmlPath, 'utf8');
    const topicPublicDir = path.join(researchPublicDir, topic.id);
    await ensureDir(topicPublicDir);
    await copyAssetsDir(topic.id);
    await copyHeroIfPresent(topic);

    const topicHtml = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${topic.title} · Research · pahari</title>
    <link rel="stylesheet" href="../../assets/styles.css" />
  </head>
  <body>
    <header class="site-header">
      <h1><a href="../../index.html">pahari</a> · Research · ${topic.title}</h1>
      <nav>
        <a href="../../index.html">Home</a>
        <a href="../../dictionary/index.html">Dictionary</a>
        <a href="../index.html" aria-current="page">Research</a>
        <a href="../../appendix/index.html">Appendix</a>
        <a href="../../works/index.html">Works</a>
        <a href="https://github.com/sudotman/outer-siraji-repo" target="_blank" rel="noopener">Contribute</a>
      </nav>
    </header>
    <main class="container">
      ${topic.hero ? `<img class="hero-image" src="./${topic.hero}" alt="${topic.title} infographic" />` : ''}
      <p class="meta"><a href="../index.html">← Back to Research</a></p>
      <div class="prose-custom">${articleHtml}</div>
    </main>
  </body>
  </html>`;
    await writeFile(path.join(topicPublicDir, 'index.html'), topicHtml, 'utf8');
  }

  // Build research hub page
  const cards = topics
    .map((t) => {
      const img = t.hero ? `<img class="thumb" src="./${t.id}/${t.hero}" alt="${t.title}" />` : '';
      return `<article class="card">${img}<h3>${t.title}</h3><p>${t.description || ''}</p><p><a class="chip" href="./${t.id}/index.html">Open</a></p></article>`;
    })
    .join('\n');

  const hubHtml = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Research · pahari</title>
    <link rel="stylesheet" href="../assets/styles.css" />
  </head>
  <body>
    <header class="site-header">
      <h1><a href="../index.html">pahari</a> · Research</h1>
      <nav>
        <a href="../index.html">Home</a>
        <a href="../dictionary/index.html">Dictionary</a>
        <a href="./index.html" aria-current="page">Research</a>
        <a href="../appendix/index.html">Appendix</a>
        <a href="../works/index.html">Works</a>
        <a href="https://github.com/sudotman/outer-siraji-repo" target="_blank" rel="noopener">Contribute</a>
      </nav>
    </header>
    <main class="container">
      <section class="hero">
        <h2>Dialect selection</h2>
        <p>Choose a topic to explore in-depth research, maps, and infographics.</p>
      </section>
      <div class="card-grid">${cards}</div>
    </main>
  </body>
  </html>`;
  await writeFile(path.join(researchPublicDir, 'index.html'), hubHtml, 'utf8');
}

async function writeAppendixHtml() {
  const appendixPublicDir = path.join(PUBLIC_DIR, 'appendix');
  await ensureDir(appendixPublicDir);
  const contentDir = path.join(ROOT, 'content');
  await ensureDir(contentDir);
  const appendixContentDir = path.join(contentDir, 'appendix');
  await ensureDir(appendixContentDir);

  const configPath = path.join(appendixContentDir, 'index.json');
  let config;
  if (existsSync(configPath)) {
    try {
      config = JSON.parse(await readFile(configPath, 'utf8'));
    } catch {
      config = { topics: [] };
    }
  } else {
    config = { topics: [ { id: 'general', title: 'General', description: 'Uncategorized selections.' } ] };
    await writeFile(configPath, JSON.stringify(config, null, 2), 'utf8');
  }

  // Ensure datasets exist per topic
  const rootAppendix = path.join(ROOT, 'appendix.json');
  const topics = Array.isArray(config?.topics) ? config.topics : [];
  for (const t of topics) {
    const id = String(t.id || 'general');
    let dataRaw = '[]';
    const tFileA = path.join(appendixContentDir, id + '.json');
    const tFileB = path.join(appendixContentDir, id, 'appendix.json');
    if (existsSync(tFileA)) dataRaw = await readFile(tFileA, 'utf8');
    else if (existsSync(tFileB)) dataRaw = await readFile(tFileB, 'utf8');
    else if (id === 'general' && existsSync(rootAppendix)) dataRaw = await readFile(rootAppendix, 'utf8');
    await writeFile(path.join(DATA_DIR, `appendix-${id}.json`), dataRaw, 'utf8');
  }

  // Topic pages
  for (const t of topics) {
    const id = String(t.id || 'general');
    const pageHtml = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${t.title || id} · Appendix · pahari</title>
    <link rel="stylesheet" href="../../assets/styles.css" />
  </head>
  <body>
    <header class="site-header">
      <h1><a href="../../index.html">pahari</a> · Appendix · ${t.title || id}</h1>
      <nav>
        <a href="../../index.html">Home</a>
        <a href="../../dictionary/index.html">Dictionary</a>
        <a href="../../research/index.html">Research</a>
        <a href="../index.html" aria-current="page">Appendix</a>
        <a href="../../works/index.html">Works</a>
        <a href="https://github.com/sudotman/outer-siraji-repo" target="_blank" rel="noopener">Contribute</a>
      </nav>
    </header>
    <main class="container">
      <section class="hero">
        <h2>Folklores, Proverbs, Riddles, Songs</h2>
        <p>${t.description || 'Selections from source texts and community oral tradition.'}</p>
        <div class="appendix-controls">
          <input id="apx-search" type="search" placeholder="Search appendix… (title, context, text)" />
          <div id="apx-filters" class="chip-row" aria-label="Filter by type"></div>
        </div>
      </section>
      <section>
        <div id="apx-grid" class="appendix-grid"></div>
      </section>
    </main>
    <script>window.APPX_FILE='appendix-${id}.json';</script>
    <script type="module" src="../../assets/appendix.js"></script>
  </body>
  </html>`;
    await ensureDir(path.join(appendixPublicDir, String(t.id)));
    await writeFile(path.join(appendixPublicDir, String(t.id), 'index.html'), pageHtml, 'utf8');
  }

  // Hub page
  const cards = topics
    .map((t) => `<article class="card"><h3>${t.title || t.id}</h3><p>${t.description || ''}</p><p><a class=\"chip\" href=\"./${t.id}/index.html\">Open</a></p></article>`)
    .join('\n');

  const hubHtml = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Appendix · pahari</title>
    <link rel="stylesheet" href="../assets/styles.css" />
  </head>
  <body>
    <header class="site-header">
      <h1><a href="../index.html">pahari</a> · Appendix</h1>
      <nav>
        <a href="../index.html">Home</a>
        <a href="../dictionary/index.html">Dictionary</a>
        <a href="../research/index.html">Research</a>
        <a href="./index.html" aria-current="page">Appendix</a>
        <a href="../works/index.html">Works</a>
        <a href="https://github.com/sudotman/outer-siraji-repo" target="_blank" rel="noopener">Contribute</a>
      </nav>
    </header>
    <main class="container">
      <section class="hero">
        <h2>Appendix collections</h2>
        <p>Browse selections grouped by topic. The existing dataset is available under General.</p>
      </section>
      <div class="card-grid">${cards}</div>
    </main>
  </body>
  </html>`;
  await writeFile(path.join(appendixPublicDir, 'index.html'), hubHtml, 'utf8');
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
.badge{display:inline-block;margin-right:.5rem;background:#0b1220;border:1px solid #334155;color:#cbd5e1;padding:.05rem .4rem;border-radius:.4rem;font-size:.75rem}
.chip-row{display:flex;flex-wrap:wrap;gap:.5rem;margin-top:.5rem}
.chip{border:1px solid #334155;color:#cbd5e1;background:#0b1220;border-radius:999px;padding:.25rem .6rem;font-size:.85rem;cursor:pointer;user-select:none}
.chip.is-active{border-color:var(--accent);background:rgba(34,211,238,.12)}
.appendix-grid{display:grid;gap:1rem;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));margin-top:1rem}
.appendix-card{background:var(--panel);border:1px solid #1f2937;padding:1rem;border-radius:.5rem}
.appendix-card h3{margin-top:0}
.pill{display:inline-block;background:#0b1220;border:1px solid #334155;color:#cbd5e1;padding:.1rem .5rem;border-radius:999px;font-size:.75rem;margin-right:.5rem}
.meta{color:var(--muted);font-size:.85rem}
.prewrap{white-space:pre-wrap}
/* Research imagery */
.thumb{width:100%;height:180px;object-fit:cover;border-radius:.5rem;margin-bottom:.5rem;border:1px solid #1f2937}
.hero-image{width:100%;max-height:520px;object-fit:contain;background:#0b1220;border:1px solid #1f2937;border-radius:.5rem;margin:1rem 0}
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
  const worksJsLines = [
    "const searchEl = document.getElementById('works-search');",
    "const filtersEl = document.getElementById('works-filters');",
    "const gridEl = document.getElementById('works-grid');",
    "(function(){ const parts = location.pathname.replace(/\\/+$/,'').split('/').filter(Boolean); window.__WORKS_BASE = parts.length >= 3 ? '../..' : '..'; })();",
    "const base = window.__WORKS_BASE;",
    "const file = (typeof window !== 'undefined' && window.WORKS_FILE) ? window.WORKS_FILE : 'works-general.json';",
    "let items = [], activeType = 'All';",
    "function esc(s){return String(s).replace(/[&<>\\\"']/g,c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','\\\"':'&quot;','\\'':'&#39;' }[c]));}",
    "function renderFilters(types){ const all = ['All', ...types]; filtersEl.innerHTML = all.map(t=>`<span class=\\\"chip\\\" data-type=\\\"${t}\\\">${t}</span>`).join(''); filtersEl.addEventListener('click', (e)=>{ const el = e.target.closest('.chip'); if(!el) return; activeType = el.dataset.type; for(const n of filtersEl.querySelectorAll('.chip')) n.classList.toggle('is-active', n.dataset.type===activeType); render(); }); const first = filtersEl.querySelector('.chip'); first && first.classList.add('is-active'); }",
    "function cardHtml(it){",
    "  const title = esc(it.title||'(Untitled)');",
    "  const type = esc(it.type||'Media');",
    "  let body = '';",
    "  if (it.embed_url){ body = `<div class=\\\"media\\\"><iframe width=\\\"560\\\" height=\\\"315\\\" src=\\\"${esc(it.embed_url)}\\\" title=\\\"Media\\\" frameborder=\\\"0\\\" allow=\\\"accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share\\\" allowfullscreen></iframe></div>`; }",
    "  if (it.description){ body += `<p>${esc(it.description)}</p>`; }",
    "  return `<article class=\\\"card\\\"><div class=\\\"pill\\\">${type}</div><h3>${title}</h3>${body}</article>`;",
    "}",
    "function haystack(it){ return [it.title,it.description,it.type].filter(Boolean).join(' '); }",
    "function render(){ let list = items; if (activeType && activeType!=='All'){ list = list.filter(it => (it.type||'').toLowerCase() === activeType.toLowerCase()); } const q=(searchEl&&searchEl.value||'').trim().toLowerCase(); if(q){ list = list.filter(it => haystack(it).toLowerCase().includes(q)); } gridEl.innerHTML = list.map(cardHtml).join(''); }",
    "async function init(){ const res = await fetch(base + '/data/' + file); const data = await res.json(); items = Array.isArray(data)?data:(Array.isArray(data.items)?data.items:[]); const types = Array.from(new Set(items.map(it=>it.type).filter(Boolean))).sort(); renderFilters(types); render(); }",
    "init();",
    "searchEl && searchEl.addEventListener('input', ()=>render());",
  ];
  const worksJs = worksJsLines.join('\n');
  const appendixJsLines = [
    "const searchEl = document.getElementById('apx-search');",
    "const filtersEl = document.getElementById('apx-filters');",
    "const gridEl = document.getElementById('apx-grid');",
    "(function(){ const parts = location.pathname.replace(/\\/+$/,'').split('/').filter(Boolean); window.__APX_BASE = parts.length >= 3 ? '../..' : '..'; })();",
    "const base = window.__APX_BASE;",
    "const file = (typeof window !== 'undefined' && window.APPX_FILE) ? window.APPX_FILE : 'appendix.json';",
    "let items = [], activeType = 'All';",
    "function esc(s){return String(s).replace(/[&<>\\\"']/g,c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','\\\"':'&quot;','\\'':'&#39;' }[c]));}",
    "function renderFilters(types){",
    "  const all = ['All', ...types];",
    "  filtersEl.innerHTML = all.map(t => `<span class=\\\"chip\\\" data-type=\\\"${t}\\\">${t}</span>`).join('');",
    "  filtersEl.addEventListener('click', (e)=>{ const el = e.target.closest('.chip'); if(!el) return; activeType = el.dataset.type; for(const n of filtersEl.querySelectorAll('.chip')) n.classList.toggle('is-active', n.dataset.type===activeType); render(); });",
    "  const first = filtersEl.querySelector('.chip'); first && first.classList.add('is-active');",
    "}",
    "function metaHtml(it){",
    "  const pages = Array.isArray(it.source_pages) ? it.source_pages.join(', ') : (it.source_page ?? it.sourcePage);",
    "  return pages ? `<div class=\\\"meta\\\">Source page(s): ${esc(String(pages))}</div>` : '';",
    "}",
    "function folkloreHtml(it){",
    "  const parts = [];",
    "  if (it.context) parts.push(`<p>${esc(it.context)}</p>`);",
    "  if (Array.isArray(it.dialogue) && it.dialogue.length){ parts.push('<div class=\\\"dialogue\\\">' + it.dialogue.map(d=>`<p><b>${esc(d.speaker||'')}</b>: ${esc(d.line_original||d.line_english||'')}</p>`).join('') + '</div>'); }",
    "  if (it.chant_original) parts.push(`<pre class=\\\"prewrap\\\">${esc(it.chant_original)}</pre>`);",
    "  if (it.translation_english) parts.push(`<p>${esc(it.translation_english)}</p>`);",
    "  if (it.conclusion) parts.push(`<p>${esc(it.conclusion)}</p>`);",
    "  return parts.join('');",
    "}",
    "function proverbHtml(it){",
    "  const id = (it.id!=null) ? `<span class=\\\"badge\\\">#${esc(String(it.id))}</span>` : '';",
    "  const parts = [];",
    "  if (it.proverb_original) parts.push(`<blockquote>${esc(it.proverb_original)}</blockquote>`);",
    "  if (it.translation_english) parts.push(`<p>${esc(it.translation_english)}</p>`);",
    "  if (it.explanation) parts.push(`<p class=\\\"meta\\\">${esc(it.explanation)}</p>`);",
    "  return id + parts.join('');",
    "}",
    "function riddleHtml(it){",
    "  const id = (it.id!=null) ? `<span class=\\\"badge\\\">#${esc(String(it.id))}</span>` : '';",
    "  const parts = [];",
    "  if (it.riddle_original) parts.push(`<blockquote>${esc(it.riddle_original)}</blockquote>`);",
    "  if (it.riddle_english_translation) parts.push(`<p>${esc(it.riddle_english_translation)}</p>`);",
    "  if (it.answer) parts.push(`<details><summary>Answer</summary><p>${esc(it.answer)}</p></details>`);",
    "  return id + parts.join('');",
    "}",
    "function songHtml(it){",
    "  const parts = [];",
    "  if (it.context) parts.push(`<p class=\\\"meta\\\">${esc(it.context)}</p>`);",
    "  if (it.lyrics_original) parts.push(`<h4>Lyrics (original)</h4><pre class=\\\"prewrap\\\">${esc(it.lyrics_original)}</pre>`);",
    "  if (it.translation_english_prose) parts.push(`<h4>Translation (English prose)</h4><div class=\\\"prewrap\\\">${esc(it.translation_english_prose)}</div>`);",
    "  if (Array.isArray(it.footnotes) && it.footnotes.length){ parts.push('<h4>Footnotes</h4><ul>' + it.footnotes.map(f=>`<li>${esc(f)}</li>`).join('') + '</ul>'); }",
    "  return parts.join('');",
    "}",
    "function cardHtml(it){",
    "  const type = (it.type||'Unknown');",
    "  const title = it.title ? esc(it.title) : (type==='Proverb'||type==='Riddle' ? type : '(Untitled)');",
    "  let body = '';",
    "  if (type==='Proverb') body = proverbHtml(it);",
    "  else if (type==='Riddle') body = riddleHtml(it);",
    "  else if (type==='Song') body = songHtml(it);",
    "  else body = folkloreHtml(it);",
    "  const meta = metaHtml(it);",
    "  return `<article class=\\\"appendix-card\\\"><div class=\\\"pill\\\">${esc(type)}</div><h3>${title}</h3>${body}${meta}</article>`;",
    "}",
    "function haystack(it){",
    "  const chunks = [];",
    "  const type = (it.type||'').toLowerCase();",
    "  if (it.title) chunks.push(it.title); if (it.context) chunks.push(it.context);",
    "  if (type==='proverb'){ if (it.proverb_original) chunks.push(it.proverb_original); if (it.translation_english) chunks.push(it.translation_english); if (it.explanation) chunks.push(it.explanation); }",
    "  else if (type==='riddle'){ if (it.riddle_original) chunks.push(it.riddle_original); if (it.riddle_english_translation) chunks.push(it.riddle_english_translation); if (it.answer) chunks.push(it.answer); }",
    "  else if (type==='song'){ if (it.lyrics_original) chunks.push(it.lyrics_original); if (it.translation_english_prose) chunks.push(it.translation_english_prose); if (Array.isArray(it.footnotes)) chunks.push(it.footnotes.join(' ')); }",
    "  else { if (it.chant_original) chunks.push(it.chant_original); if (it.translation_english) chunks.push(it.translation_english); if (it.conclusion) chunks.push(it.conclusion); if (Array.isArray(it.dialogue)) chunks.push(it.dialogue.map(d=>[d.speaker,d.line_original,d.line_english].filter(Boolean).join(' ')).join(' ')); }",
    "  return chunks.filter(Boolean).join(' ');",
    "}",
    "function render(){",
    "  const q = (searchEl && searchEl.value || '').trim();",
    "  let list = items;",
    "  if (activeType && activeType !== 'All'){ list = list.filter(it => (it.type||'').toLowerCase() === activeType.toLowerCase()); }",
    "  if (q){ const low = q.toLowerCase(); list = list.filter(it => haystack(it).toLowerCase().includes(low)); }",
    "  gridEl.innerHTML = list.map(cardHtml).join('');",
    "}",
    "async function init(){",
    "  const res = await fetch(base + '/data/' + file);",
    "  const data = await res.json();",
    "  items = Array.isArray(data) ? data : (Array.isArray(data.items) ? data.items : []);",
    "  const types = Array.from(new Set(items.map(it => it.type).filter(Boolean))).sort();",
    "  renderFilters(types);",
    "  render();",
    "}",
    "init();",
    "searchEl && searchEl.addEventListener('input', ()=>render());",
  ];
  const appendixJs = appendixJsLines.join('\n');
  await writeFile(path.join(ASSETS_DIR, 'styles.css'), css, 'utf8');
  await writeFile(path.join(ASSETS_DIR, 'search.js'), searchJs, 'utf8');
  await writeFile(path.join(ASSETS_DIR, 'appendix.js'), appendixJs, 'utf8');
  await writeFile(path.join(ASSETS_DIR, 'works.js'), worksJs, 'utf8');
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
  // Appendix data + page
  const appendixSrc = path.join(ROOT, 'appendix.json');
  if (existsSync(appendixSrc)) {
    const appendixRaw = await readFile(appendixSrc, 'utf8');
    await writeFile(path.join(DATA_DIR, 'appendix.json'), appendixRaw, 'utf8');
  } else {
    await writeFile(path.join(DATA_DIR, 'appendix.json'), '[]', 'utf8');
  }
  await writeAppendixHtml();
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



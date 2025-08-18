import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

function normalize(str) {
  if (!str) return '';
  return str
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

async function build() {
  const inputPath = resolve('data/dictionary.json');
  const outputPath = resolve('data/search-index.json');
  const raw = await readFile(inputPath, 'utf8');
  const items = JSON.parse(raw);

  const index = items.map(entry => {
    const headDeva = entry?.head?.devanagari || '';
    const headRoman = entry?.head?.roman || '';
    const pos = entry?.pos || '';
    const senses = Array.isArray(entry?.senses) ? entry.senses : [];
    const textParts = [headDeva, headRoman, pos];
    for (const s of senses) {
      if (s?.gloss_en) textParts.push(s.gloss_en);
      if (s?.gloss_hi) textParts.push(s.gloss_hi);
      if (s?.definition) textParts.push(s.definition);
      if (Array.isArray(s?.examples)) {
        for (const ex of s.examples) {
          if (ex?.siraji) textParts.push(ex.siraji);
          if (ex?.en) textParts.push(ex.en);
          if (ex?.hi) textParts.push(ex.hi);
        }
      }
    }
    const text = normalize(textParts.join(' \n '));
    return {
      id: entry.id,
      head: { devanagari: headDeva, roman: headRoman },
      pos,
      text
    };
  });

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, JSON.stringify(index, null, 2), 'utf8');
  console.log(`Wrote index with ${index.length} entries to ${outputPath}`);
}

build().catch(err => {
  console.error(err);
  process.exit(1);
});



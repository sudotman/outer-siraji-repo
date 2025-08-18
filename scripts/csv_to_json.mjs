import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { parse } from 'csv-parse/sync';
import { resolve, dirname } from 'node:path';

const INPUT = resolve('mainDictionary.csv');
const OUTPUT = resolve('data/dictionary.json');

function get(obj, key, fallback = '') {
  return (obj[key] ?? '').toString().trim();
}

function toEntry(row, idx) {
  const headRoman = get(row, 'Word');
  const pos = get(row, 'Part_of_Speech');
  const etym = get(row, 'Etymology');
  const definition = get(row, 'Definition');
  const ex = get(row, 'Examples_and_Notes');
  const page = get(row, 'Source_Page');
  return {
    id: `manual-${(idx + 1).toString().padStart(5, '0')}`,
    head: { devanagari: '', roman: headRoman },
    pos,
    etymology: etym,
    senses: [
      {
        gloss_en: definition || headRoman,
        definition,
        examples: ex ? [{ siraji: '', en: ex }] : []
      }
    ],
    audio: [],
    video: [],
    tags: [],
    sourcePage: page
  };
}

async function build() {
  const csv = await readFile(INPUT, 'utf8');
  const rows = parse(csv, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true,
    relax_column_count: true,
    relax_column_count_less: true,
    relax_column_count_more: true,
    skip_records_with_error: true
  });
  const entries = rows.map((r, i) => toEntry(r, i));
  await mkdir(dirname(OUTPUT), { recursive: true });
  await writeFile(OUTPUT, JSON.stringify(entries, null, 2), 'utf8');
  console.log(`Wrote ${entries.length} entries to ${OUTPUT}`);
}

build().catch(err => {
  console.error(err);
  process.exit(1);
});



// Reads books.ndjson, looks up a cover image for each entry that has an
// Open Library "works" link, and writes books-with-covers.ndjson alongside
// it (leaves the original file untouched).
//
// Usage (from inside the sanity/ folder):
//   node fetch-covers.mjs
//
// Then import the result with --replace so it updates your existing
// documents instead of creating duplicates:
//   npx sanity dataset import books-with-covers.ndjson production --replace

import fs from 'node:fs';
import readline from 'node:readline';

const INPUT = new URL('./books.ndjson', import.meta.url);
const OUTPUT = new URL('./books-with-covers.ndjson', import.meta.url);

const WORK_ID_RE = /openlibrary\.org\/works\/(OL\d+W)/i;

async function fetchCoverUrl(link) {
  const match = link.match(WORK_ID_RE);
  if (!match) return null;
  const workId = match[1];
  try {
    const res = await fetch(`https://openlibrary.org/works/${workId}.json`);
    if (!res.ok) return null;
    const data = await res.json();
    const coverId = Array.isArray(data.covers) && data.covers.length > 0 ? data.covers[0] : null;
    if (!coverId || coverId < 0) return null;
    return `https://covers.openlibrary.org/b/id/${coverId}-M.jpg`;
  } catch (err) {
    console.warn(`  Failed to fetch ${workId}:`, err.message);
    return null;
  }
}

async function run() {
  const rl = readline.createInterface({
    input: fs.createReadStream(INPUT),
    crlfDelay: Infinity,
  });

  const out = fs.createWriteStream(OUTPUT);
  let total = 0;
  let found = 0;
  let skipped = 0;

  for await (const line of rl) {
    if (!line.trim()) continue;
    total += 1;
    const doc = JSON.parse(line);

    if (doc.link) {
      const coverUrl = await fetchCoverUrl(doc.link);
      if (coverUrl) {
        doc.coverUrl = coverUrl;
        found += 1;
      } else {
        skipped += 1;
      }
      // Be polite to Open Library's API.
      await new Promise((r) => setTimeout(r, 150));
    } else {
      skipped += 1;
    }

    out.write(JSON.stringify(doc) + '\n');
    if (total % 25 === 0) {
      console.log(`Processed ${total}... (${found} covers found so far)`);
    }
  }

  out.end();
  console.log(`\nDone. ${found} covers found, ${skipped} skipped, ${total} total.`);
  console.log(`Wrote ${OUTPUT.pathname}`);
}

run();

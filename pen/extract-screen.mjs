// Extracts one top-level screen frame from the html-tailwind export by its
// data-pencil-name, so individual screens can be read without loading the
// whole 1.7 MB file.
//
//   node extract-screen.mjs "02 · Voter Dashboard" > /tmp/screen.html
import { readFileSync } from 'node:fs';

const name = process.argv[2];
if (!name) {
  console.error('usage: node extract-screen.mjs "<data-pencil-name>"');
  process.exit(1);
}

const html = readFileSync(new URL('./vote-anywhere.html', import.meta.url), 'utf8');
const needle = `data-pencil-name="${name.replace(/&/g, '&amp;')}"`;
const marker = html.indexOf(needle);
if (marker === -1) {
  console.error(`not found: ${name}`);
  process.exit(1);
}

const start = html.lastIndexOf('<div', marker);
let depth = 0;
let i = start;
while (i < html.length) {
  if (html.startsWith('<div', i)) depth++;
  else if (html.startsWith('</div>', i)) {
    depth--;
    if (depth === 0) {
      const frame = html
        .slice(start, i + 6)
        .replace(/ d="[^"]*"/g, ' d="…"')
        .replace(/\n\s*\n/g, '\n');
      console.log(frame);
      process.exit(0);
    }
  }
  i++;
}
console.error('unterminated frame');
process.exit(1);

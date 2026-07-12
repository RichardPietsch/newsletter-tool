import { readFileSync } from 'node:fs';
import { globSync } from 'node:fs';

const dictionarySource = readFileSync('lib/i18n/ui-text.ts', 'utf8');
const registered = new Set([...dictionarySource.matchAll(/:\s*'([^']+)'/g)].map((match) => match[1]));
const roots = ['app', 'components'];
const files = roots.flatMap((root) => globSync(`${root}/**/*.{ts,tsx}`, { exclude: ['**/*.test.ts', '**/*.test.tsx'] }));
const textPattern = />([^<>{}][^<>{}]*(?:[A-Za-zÄÖÜäöüß][^<>{}]*)?)<|(?:aria-label|title|placeholder)=(?:\"([^\"]+)\"|'([^']+)')/g;
const technical = [/^use client$/, /^#[0-9a-fA-F]{3,8}$/, /^https?:/, /^mailto:/, /^de-DE$/, /^text\//, /^image\//, /^application\//, /^[/a-z0-9_.?=&:-]+$/i, /^(GET|POST|PUT|PATCH|DELETE)$/];
const unknown = [];

for (const file of files) {
  const source = readFileSync(file, 'utf8');
  for (const match of source.matchAll(textPattern)) {
    const value = (match[1] ?? match[2] ?? match[3] ?? '').trim().replace(/\s+/g, ' ');
    if (!value || value.length < 2) continue;
    if (/[;{}=>]/.test(value)) continue;
    if (technical.some((regex) => regex.test(value))) continue;
    if (registered.has(value)) continue;
    unknown.push(`${file}: ${value}`);
  }
}

if (unknown.length > 0) {
  console.error('Nicht zentralisierte UI-Texte gefunden:');
  for (const item of unknown.slice(0, 80)) console.error(`- ${item}`);
  if (unknown.length > 80) console.error(`… ${unknown.length - 80} weitere`);
  process.exit(1);
}

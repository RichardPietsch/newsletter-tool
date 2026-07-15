import { globSync, readFileSync } from 'node:fs';

const roots = ['app', 'components'];
const files = roots.flatMap((root) => globSync(`${root}/**/*.{ts,tsx}`, { exclude: ['**/*.test.ts', '**/*.test.tsx'] }));
const textPattern = />([^<>{}][^<>{}]*(?:[A-Za-zÄÖÜäöüß][^<>{}]*)?)<|(?:aria-label|title|placeholder|alt)=(?:"([^"]+)"|'([^']+)')/g;
const technical = [
  /^use client$/,
  /^#[0-9a-fA-F]{3,8}$/,
  /^https?:/,
  /^mailto:/,
  /^de-DE$/,
  /^text\//,
  /^image\//,
  /^application\//,
  /^[/a-z0-9_.?=&:…-]+$/i,
  /^(GET|POST|PUT|PATCH|DELETE)$/,
  /^[A-Z0-9¶↗]+$/,
];
const raw = [];

for (const file of files) {
  const source = readFileSync(file, 'utf8');
  for (const match of source.matchAll(textPattern)) {
    const value = (match[1] ?? match[2] ?? match[3] ?? '').trim().replace(/\s+/g, ' ');
    if (!value || value.length < 2) continue;
    if (/[;{}=>]/.test(value)) continue;
    if (technical.some((regex) => regex.test(value))) continue;
    raw.push(`${file}: ${value}`);
  }
}

if (raw.length > 0) {
  console.error('Dezentral gepflegte UI-Texte gefunden. Bitte in lib/i18n/locales/de.ts hinterlegen und per t(...) referenzieren:');
  for (const item of raw.slice(0, 120)) console.error(`- ${item}`);
  if (raw.length > 120) console.error(`… ${raw.length - 120} weitere`);
  process.exit(1);
}

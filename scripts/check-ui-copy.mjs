import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const customRoots = process.argv.slice(2);
const uiRoots = customRoots.length > 0 ? customRoots : ['app', 'components'];
const apiRoots = customRoots.length > 0 ? customRoots : ['app/api', 'lib/api'];
const sourceExtensions = new Set(['.ts', '.tsx', '.mts']);

function collectSourceFiles(directory) {
  const entries = readdirSync(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectSourceFiles(fullPath));
      continue;
    }

    const extension = path.extname(entry.name);
    if (!sourceExtensions.has(extension)) continue;
    if (entry.name.endsWith('.test.ts') || entry.name.endsWith('.test.tsx')) continue;
    files.push(fullPath);
  }

  return files;
}

const uiFiles = uiRoots.flatMap((root) => collectSourceFiles(root));
const apiFiles = apiRoots.flatMap((root) => collectSourceFiles(root));
const textPattern =
  />([^<>{}][^<>{}]*(?:[A-Za-zÄÖÜäöüß][^<>{}]*)?)<|(?:aria-label|title|placeholder|alt)=(?:"([^"]+)"|'([^']+)')/g;
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
  /^\)\s*:\s*\($/,
];
const raw = [];
const uncodedApiCopy = [];

for (const file of uiFiles) {
  const source = readFileSync(file, 'utf8');
  for (const match of source.matchAll(textPattern)) {
    const value = (match[1] ?? match[2] ?? match[3] ?? '').trim().replace(/\s+/g, ' ');
    if (!value || value.length < 2) continue;
    if (/[;{}=>&|]/.test(value)) continue;
    if (technical.some((regex) => regex.test(value))) continue;
    raw.push(`${file}: ${value}`);
  }
}

const uncodedApiCopyPattern = /NextResponse\.json\(\s*\{\s*(?:error|message)\s*:\s*(?:"([^"]+)"|'([^']+)'|`([^`]+)`)/g;

for (const file of apiFiles) {
  const source = readFileSync(file, 'utf8');
  for (const match of source.matchAll(uncodedApiCopyPattern)) {
    const value = match[1] ?? match[2] ?? match[3] ?? '';
    uncodedApiCopy.push(`${file}: ${value}`);
  }
}

if (raw.length > 0) {
  console.error(
    'Dezentral gepflegte UI-Texte gefunden. Bitte in lib/i18n/locales/de.ts hinterlegen und per t(...) referenzieren:',
  );
  for (const item of raw) console.error(`- ${item}`);
  process.exit(1);
}

if (uncodedApiCopy.length > 0) {
  console.error(
    'Uncodierte API-Texte gefunden. Bitte strukturierte Fehlercodes verwenden und Texte UI-seitig per t(...) übersetzen:',
  );
  for (const item of uncodedApiCopy) console.error(`- ${item}`);
  process.exit(1);
}

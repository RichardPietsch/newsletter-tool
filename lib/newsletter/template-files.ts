import { readdir, readFile } from 'fs/promises';
import path from 'path';
import { nanoid } from 'nanoid';
import { db } from '@/lib/db';
import { newsletters } from '@/lib/db/schema';
import { newsletterDocumentSchema, type NewsletterDocument } from './schema';

type NewsletterTemplateFile = {
  title: string;
  createdAt?: string;
  updatedAt?: string;
  document: NewsletterDocument;
};

const TEMPLATE_DIRECTORY = path.join(process.cwd(), 'public', 'assets', 'newsletter-templates');

function readYamlString(lines: string[], key: string) {
  const prefix = `${key}:`;
  const line = lines.find((entry) => entry.startsWith(prefix));
  if (!line) return undefined;
  const value = line.slice(prefix.length).trim();
  if (!value) return undefined;
  return JSON.parse(value) as string;
}

export function serializeNewsletterTemplate({ title, createdAt, updatedAt, document }: NewsletterTemplateFile) {
  const json = JSON.stringify(newsletterDocumentSchema.parse(document), null, 2)
    .split('\n')
    .map((line) => `  ${line}`)
    .join('\n');

  return [
    `title: ${JSON.stringify(title)}`,
    createdAt ? `createdAt: ${JSON.stringify(createdAt)}` : undefined,
    updatedAt ? `updatedAt: ${JSON.stringify(updatedAt)}` : undefined,
    'documentJson: |',
    json,
    '',
  ]
    .filter((line): line is string => line !== undefined)
    .join('\n');
}

export function parseNewsletterTemplateYaml(source: string): NewsletterTemplateFile {
  const documentMatch = source.match(/^documentJson:\s*\|\s*\n([\s\S]*)$/m);
  if (!documentMatch) throw new Error('Newsletter-Template enthält kein documentJson-Feld.');
  const documentIndex = documentMatch.index ?? 0;
  const lines = source.slice(0, documentIndex).split(/\r?\n/);
  const title = readYamlString(lines, 'title');
  if (!title) throw new Error('Newsletter-Template enthält keinen Titel.');

  const documentJson = documentMatch[1]
    .split(/\r?\n/)
    .map((line) => (line.startsWith('  ') ? line.slice(2) : line))
    .join('\n')
    .trim();
  const document = newsletterDocumentSchema.parse(JSON.parse(documentJson));

  return {
    title,
    createdAt: readYamlString(lines, 'createdAt'),
    updatedAt: readYamlString(lines, 'updatedAt'),
    document,
  };
}

async function readTemplateFiles() {
  let filenames: string[];
  try {
    filenames = await readdir(TEMPLATE_DIRECTORY);
  } catch {
    return [];
  }

  const templates = await Promise.all(
    filenames
      .filter((filename) => filename.endsWith('.yml') || filename.endsWith('.yaml'))
      .sort((a, b) => a.localeCompare(b))
      .map(async (filename) => parseNewsletterTemplateYaml(await readFile(path.join(TEMPLATE_DIRECTORY, filename), 'utf8'))),
  );
  return templates;
}

function documentWithFreshIds(document: NewsletterDocument): NewsletterDocument {
  return {
    ...document,
    blocks: document.blocks.map((block) => ({
      ...block,
      id: nanoid(),
      ...(block.type === 'eventGrid' ? { items: block.items.map((item) => ({ ...item, id: nanoid() })) } : {}),
    })),
  };
}

export async function seedNewsletterTemplatesForUser(ownerId: string) {
  const templates = await readTemplateFiles();
  if (templates.length === 0) return;

  await db.insert(newsletters).values(
    templates.map((template) => {
      const document = documentWithFreshIds(template.document);
      return {
        id: nanoid(),
        ownerId,
        title: template.title,
        document: { ...document, title: template.title },
      };
    }),
  );
}

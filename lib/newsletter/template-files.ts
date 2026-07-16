import { readdir, readFile, stat } from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import { nanoid } from 'nanoid';
import { db } from '@/lib/db';
import { serverEnv } from '@/lib/env';
import { assets as assetTable, newsletters } from '@/lib/db/schema';
import { newsletterDocumentSchema, type NewsletterDocument } from './schema';

type NewsletterTemplateFile = {
  title: string;
  createdAt?: string;
  updatedAt?: string;
  document: NewsletterDocument;
};

type DemoAssetDefinition = {
  filename: string;
  title: string;
  altText: string;
};

export type DemoAssetSeed = DemoAssetDefinition & {
  id: string;
  publicUrl: string;
};

export type DemoAssetSeedMap = Record<string, DemoAssetSeed>;

const TEMPLATE_DIRECTORY = path.join(process.cwd(), 'public', 'assets', 'newsletter-templates');
const DEMO_ASSET_DIRECTORY = path.join(TEMPLATE_DIRECTORY, 'demo-assets');
const DEMO_ASSETS: DemoAssetDefinition[] = [
  { filename: 'demo-whisky.jpg', title: 'Whiskytasting', altText: 'Whiskytasting im Anglo-German Club' },
  { filename: 'demo-gaense.jpg', title: 'Gänseessen', altText: 'Traditionelles Gänseessen der Junioren' },
];

function readYamlString(lines: string[], key: string) {
  const prefix = `${key}:`;
  const line = lines.find((entry) => entry.startsWith(prefix));
  if (!line) return undefined;
  const value = line.slice(prefix.length).trim();
  if (!value) return undefined;
  return JSON.parse(value) as string;
}

function publicDemoAssetUrl(filename: string) {
  return new URL(`/assets/newsletter-templates/demo-assets/${filename}`, serverEnv.appUrl).toString();
}

function demoFilenameFromUrl(src?: string) {
  if (!src) return undefined;
  return DEMO_ASSETS.find((asset) => src.endsWith(`/demo-assets/${asset.filename}`) || src.endsWith(asset.filename))
    ?.filename;
}

function applyDemoImage(
  image: { src?: string; alt?: string; decorative?: boolean; assetId?: string; href?: string } | undefined,
  demoAssets: DemoAssetSeedMap,
) {
  const filename = demoFilenameFromUrl(image?.src);
  if (!filename || !demoAssets[filename]) return image;
  const asset = demoAssets[filename];
  return {
    ...image,
    assetId: asset.id,
    src: asset.publicUrl,
    alt: asset.altText,
    decorative: false,
  };
}

export function applyDemoAssetsToDocument(
  document: NewsletterDocument,
  demoAssets: DemoAssetSeedMap,
): NewsletterDocument {
  if (Object.keys(demoAssets).length === 0) return document;
  const nextDocument = {
    ...document,
    blocks: document.blocks.map((block) => {
      if (block.type === 'image') {
        const image = applyDemoImage(block, demoAssets);
        return image ? { ...block, ...image } : block;
      }
      if (block.type === 'event') return { ...block, image: applyDemoImage(block.image, demoAssets) };
      if (block.type === 'featuredEvent') return { ...block, image: applyDemoImage(block.image, demoAssets) };
      if (block.type === 'eventGrid')
        return {
          ...block,
          items: block.items.map((item) => ({ ...item, image: applyDemoImage(item.image, demoAssets) })),
        };
      return block;
    }),
  };
  return newsletterDocumentSchema.parse(nextDocument);
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
      .map(async (filename) =>
        parseNewsletterTemplateYaml(await readFile(path.join(TEMPLATE_DIRECTORY, filename), 'utf8')),
      ),
  );
  return templates;
}

function documentWithFreshIds(document: NewsletterDocument): NewsletterDocument {
  const nextDocument = {
    ...document,
    blocks: document.blocks.map((block) => ({
      ...block,
      id: nanoid(),
      ...(block.type === 'eventGrid' ? { items: block.items.map((item) => ({ ...item, id: nanoid() })) } : {}),
    })),
  };
  return newsletterDocumentSchema.parse(nextDocument);
}

async function seedDemoAssetsForUser(ownerId: string): Promise<DemoAssetSeedMap> {
  const rows = await Promise.all(
    DEMO_ASSETS.map(async (asset) => {
      const filePath = path.join(DEMO_ASSET_DIRECTORY, asset.filename);
      let fileStats;
      try {
        fileStats = await stat(filePath);
      } catch {
        return undefined;
      }
      const metadata = await sharp(filePath).metadata();
      const id = nanoid();
      const publicUrl = publicDemoAssetUrl(asset.filename);
      return {
        id,
        ownerId,
        storageKey: `newsletter-templates/demo-assets/${asset.filename}`,
        publicUrl,
        originalFilename: asset.filename,
        title: asset.title,
        altText: asset.altText,
        mimeType: 'image/jpeg',
        width: metadata.width ?? 0,
        height: metadata.height ?? 0,
        sizeBytes: fileStats.size,
      };
    }),
  );

  const assetRows = rows.filter((row): row is NonNullable<typeof row> => row !== undefined);
  if (assetRows.length > 0) await db.insert(assetTable).values(assetRows);

  return Object.fromEntries(
    assetRows.map((row) => [
      row.originalFilename,
      {
        id: row.id,
        filename: row.originalFilename,
        title: row.title ?? row.originalFilename,
        altText: row.altText ?? '',
        publicUrl: row.publicUrl,
      } satisfies DemoAssetSeed,
    ]),
  );
}

export async function seedNewsletterTemplatesForUser(ownerId: string) {
  const templates = await readTemplateFiles();
  if (templates.length === 0) return;

  const demoAssets = await seedDemoAssetsForUser(ownerId);

  await db.insert(newsletters).values(
    templates.map((template) => {
      const document = applyDemoAssetsToDocument(documentWithFreshIds(template.document), demoAssets);
      return {
        id: nanoid(),
        ownerId,
        title: template.title,
        document: { ...document, title: template.title },
      };
    }),
  );
}

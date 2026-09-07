import { newsletterDocumentSchema, type NewsletterDocument } from '../schema';
import { t } from '@/lib/i18n';
import { newsletterColorVariables, newsletterTextColorRole } from '@/lib/newsletter/module-styles';
import { CURRENT_NEWSLETTER_SCHEMA_VERSION } from './version';

export { CURRENT_NEWSLETTER_SCHEMA_VERSION } from './version';

export type NewsletterMigrationErrorCode = 'INVALID_DOCUMENT' | 'INVALID_SCHEMA_VERSION' | 'UNSUPPORTED_SCHEMA_VERSION';

export class NewsletterMigrationError extends Error {
  constructor(
    public readonly code: NewsletterMigrationErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'NewsletterMigrationError';
  }
}

type MutableDocument = Record<string, unknown>;
type NewsletterMigration = (document: MutableDocument) => MutableDocument;

function migratedImageAlt(image: MutableDocument) {
  if (typeof image.src === 'string') {
    const filename = image.src
      .split(/[?#]/)[0]
      .split('/')
      .at(-1)
      ?.replace(/\.[^.]+$/, '')
      .replace(/[-_]+/g, ' ')
      .trim();
    if (filename) return filename;
  }
  return t('validation.migratedImageAlt');
}

function migrateImage(input: unknown) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return input;
  const image = { ...(input as MutableDocument) };
  delete image.decorative;
  delete image.href;
  const hasImage =
    (typeof image.src === 'string' && image.src.trim().length > 0) ||
    (typeof image.assetId === 'string' && image.assetId.trim().length > 0);
  if (hasImage && (typeof image.alt !== 'string' || !image.alt.trim())) image.alt = migratedImageAlt(image);
  return image;
}

function migrateRichText(input: unknown): unknown {
  if (Array.isArray(input)) return input.map(migrateRichText);
  if (!input || typeof input !== 'object') return input;
  const node = { ...(input as MutableDocument) };
  if (Array.isArray(node.marks)) {
    node.marks = node.marks.map((inputMark) => {
      if (!inputMark || typeof inputMark !== 'object' || Array.isArray(inputMark)) return inputMark;
      const mark = inputMark as MutableDocument;
      if (mark.type !== 'textStyle' || !mark.attrs || typeof mark.attrs !== 'object' || Array.isArray(mark.attrs))
        return mark;
      const attrs = mark.attrs as MutableDocument;
      if (typeof attrs.color !== 'string') return mark;
      const role = newsletterTextColorRole(attrs.color);
      return role === 'muted' || role === 'accent'
        ? { ...mark, attrs: { ...attrs, color: newsletterColorVariables[role] } }
        : mark;
    });
  }
  if (Array.isArray(node.content)) node.content = node.content.map(migrateRichText);
  return node;
}

function migrateImagesInBlock(input: unknown): unknown {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return input;
  const block = input as MutableDocument;
  if (block.type === 'image') return migrateImage(block);
  if (block.type === 'text') return { ...block, content: migrateRichText(block.content) };
  if (block.type === 'event' || block.type === 'featuredEvent') return { ...block, image: migrateImage(block.image) };
  if (block.type === 'eventGrid') {
    return {
      ...block,
      items: Array.isArray(block.items)
        ? block.items.map((inputItem) => {
            if (!inputItem || typeof inputItem !== 'object' || Array.isArray(inputItem)) return inputItem;
            const item = inputItem as MutableDocument;
            return { ...item, image: migrateImage(item.image) };
          })
        : block.items,
    };
  }
  if (block.type === 'backgroundSection') {
    return {
      ...block,
      blocks: Array.isArray(block.blocks) ? block.blocks.map(migrateImagesInBlock) : block.blocks,
    };
  }
  return block;
}

const migrations: Record<number, NewsletterMigration> = {
  0: (document) => ({ ...document, schemaVersion: 1 }),
  1: (document) => ({ ...document, schemaVersion: 2 }),
  2: (document) => ({
    ...document,
    schemaVersion: 3,
    blocks: Array.isArray(document.blocks) ? document.blocks.map(migrateImagesInBlock) : document.blocks,
  }),
};

function documentVersion(input: unknown) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new NewsletterMigrationError('INVALID_DOCUMENT', 'Newsletter-Dokument muss ein Objekt sein.');
  }

  const version = (input as MutableDocument).schemaVersion ?? 0;
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 0) {
    throw new NewsletterMigrationError(
      'INVALID_SCHEMA_VERSION',
      'Newsletter-Dokument enthält keine gültige schemaVersion.',
    );
  }
  if (version > CURRENT_NEWSLETTER_SCHEMA_VERSION) {
    throw new NewsletterMigrationError(
      'UNSUPPORTED_SCHEMA_VERSION',
      `Newsletter-Dokument verwendet die nicht unterstützte schemaVersion ${version}.`,
    );
  }
  return version;
}

export function migrateNewsletterDocument(input: unknown): NewsletterDocument {
  let version = documentVersion(input);
  let document = { ...(input as MutableDocument) };

  while (version < CURRENT_NEWSLETTER_SCHEMA_VERSION) {
    const migrate = migrations[version];
    if (!migrate) {
      throw new NewsletterMigrationError(
        'UNSUPPORTED_SCHEMA_VERSION',
        `Für schemaVersion ${version} ist keine Newsletter-Migration registriert.`,
      );
    }
    document = migrate(document);
    version = documentVersion(document);
  }

  const parsed = newsletterDocumentSchema.safeParse(document);
  if (!parsed.success) {
    throw new NewsletterMigrationError('INVALID_DOCUMENT', 'Newsletter-Dokument ist nach der Migration ungültig.', {
      cause: parsed.error,
    });
  }
  return parsed.data;
}

export function safeMigrateNewsletterDocument(input: unknown) {
  try {
    return { success: true, data: migrateNewsletterDocument(input) } as const;
  } catch (error) {
    const migrationError =
      error instanceof NewsletterMigrationError
        ? error
        : new NewsletterMigrationError('INVALID_DOCUMENT', 'Newsletter-Dokument konnte nicht migriert werden.', {
            cause: error,
          });
    return { success: false, error: migrationError } as const;
  }
}

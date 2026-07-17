import { newsletterDocumentSchema, type NewsletterDocument } from '../schema';
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

const migrations: Record<number, NewsletterMigration> = {
  0: (document) => ({ ...document, schemaVersion: 1 }),
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

import { describe, expect, it } from 'vitest';
import { createDefaultDocument } from '@/lib/newsletter/defaults';
import {
  CURRENT_NEWSLETTER_SCHEMA_VERSION,
  migrateNewsletterDocument,
  NewsletterMigrationError,
} from '@/lib/newsletter/migrations';

describe('newsletter document migrations', () => {
  function migrationError(input: unknown) {
    try {
      migrateNewsletterDocument(input);
    } catch (error) {
      expect(error).toBeInstanceOf(NewsletterMigrationError);
      return error as NewsletterMigrationError;
    }
    throw new Error('Migration hätte fehlschlagen müssen.');
  }

  it('keeps a current document unchanged', () => {
    const current = createDefaultDocument('Aktuelles Dokument');

    expect(migrateNewsletterDocument(current)).toEqual(current);
    expect(current.schemaVersion).toBe(CURRENT_NEWSLETTER_SCHEMA_VERSION);
  });

  it('migrates a version zero document', () => {
    const current = createDefaultDocument('Altes Dokument');
    const legacy = { ...current, schemaVersion: 0 };

    expect(migrateNewsletterDocument(legacy)).toEqual(current);
  });

  it('returns a controlled error for an invalid document', () => {
    const error = migrationError({ ...createDefaultDocument('Ungültig'), unsupportedField: true });

    expect(error).toMatchObject({ name: 'NewsletterMigrationError', code: 'INVALID_DOCUMENT' });
  });

  it('rejects documents from unsupported future versions', () => {
    const error = migrationError({ schemaVersion: CURRENT_NEWSLETTER_SCHEMA_VERSION + 1 });

    expect(error.code).toBe('UNSUPPORTED_SCHEMA_VERSION');
  });
});

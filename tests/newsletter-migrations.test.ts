import { describe, expect, it } from 'vitest';
import { createBlock, createDefaultDocument } from '@/lib/newsletter/defaults';
import { insertBlock } from '@/lib/newsletter/operations';
import { newsletterColorVariables } from '@/lib/newsletter/module-styles';
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

  it('upgrades legacy image options, alt text and fixed text colors', () => {
    let current = createDefaultDocument('Alte Bilder');
    current = insertBlock(current, 1, createBlock('backgroundSection'));
    const legacy = {
      ...current,
      schemaVersion: 2,
      blocks: current.blocks.map((block) =>
        block.type === 'backgroundSection'
          ? {
              ...block,
              blocks: [
                {
                  id: 'legacy-image',
                  type: 'image',
                  src: 'https://assets.example.com/sommer-fest.jpg',
                  alt: '',
                  decorative: true,
                  href: 'https://example.com',
                },
                {
                  id: 'legacy-text',
                  type: 'text',
                  background: 'white',
                  content: {
                    type: 'doc',
                    content: [
                      {
                        type: 'paragraph',
                        content: [
                          {
                            type: 'text',
                            text: 'Akzent',
                            marks: [{ type: 'textStyle', attrs: { color: '#a63a3a' } }],
                          },
                        ],
                      },
                    ],
                  },
                },
              ],
            }
          : block,
      ),
    };

    const migrated = migrateNewsletterDocument(legacy);
    const section = migrated.blocks.find((block) => block.type === 'backgroundSection');
    const image = section?.type === 'backgroundSection' ? section.blocks[0] : undefined;
    const text = section?.type === 'backgroundSection' ? section.blocks[1] : undefined;

    expect(migrated.schemaVersion).toBe(CURRENT_NEWSLETTER_SCHEMA_VERSION);
    expect(image).toMatchObject({ type: 'image', alt: 'sommer fest' });
    expect(image).not.toHaveProperty('decorative');
    expect(image).not.toHaveProperty('href');
    expect(text?.type === 'text' ? text.content.content?.[0] : undefined).toMatchObject({
      content: [
        {
          marks: [{ attrs: { color: newsletterColorVariables.accent } }],
        },
      ],
    });
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

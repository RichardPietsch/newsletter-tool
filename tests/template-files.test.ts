import { describe, expect, it } from 'vitest';
import { createBlock, createDefaultDocument } from '@/lib/newsletter/defaults';
import { insertBlock } from '@/lib/newsletter/operations';
import { parseNewsletterTemplateYaml, serializeNewsletterTemplate } from '@/lib/newsletter/template-files';

describe('newsletter template files', () => {
  it('serializes and parses newsletter templates with metadata', () => {
    const document = insertBlock(createDefaultDocument('Template Test'), 1, createBlock('text'));
    const yml = serializeNewsletterTemplate({
      title: 'Template Test',
      createdAt: '2026-07-10T00:00:00.000Z',
      updatedAt: '2026-07-10T00:00:00.000Z',
      document,
    });

    expect(yml).toContain('documentJson: |');
    const parsed = parseNewsletterTemplateYaml(yml);
    expect(parsed.title).toBe('Template Test');
    expect(parsed.createdAt).toBe('2026-07-10T00:00:00.000Z');
    expect(parsed.document.blocks.map((block) => block.type)).toEqual(['header', 'text', 'footer']);
  });
});

import { describe, expect, it } from 'vitest';
import { createBlock, createDefaultDocument } from '@/lib/newsletter/defaults';
import { insertBlock } from '@/lib/newsletter/operations';
import { applyDemoAssetsToDocument, parseNewsletterTemplateYaml, serializeNewsletterTemplate } from '@/lib/newsletter/template-files';

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
  it('links static demo asset metadata into template documents', () => {
    const document = insertBlock(createDefaultDocument('Template Test'), 1, {
      ...createBlock('featuredEvent'),
      image: {
        src: 'http://localhost:3000/assets/newsletter-templates/demo-assets/demo-whisky.jpg',
        alt: 'Placeholder',
        decorative: false,
      },
    });

    const linked = applyDemoAssetsToDocument(document, {
      'demo-whisky.jpg': {
        id: 'asset-whisky',
        filename: 'demo-whisky.jpg',
        title: 'Whiskytasting',
        altText: 'Whiskytasting im Anglo-German Club',
        publicUrl: 'https://example.com/assets/newsletter-templates/demo-assets/demo-whisky.jpg',
      },
    });

    const featured = linked.blocks.find((block) => block.type === 'featuredEvent');
    expect(featured?.type).toBe('featuredEvent');
    if (featured?.type !== 'featuredEvent') throw new Error('featured event missing');
    expect(featured.image).toMatchObject({
      assetId: 'asset-whisky',
      src: 'https://example.com/assets/newsletter-templates/demo-assets/demo-whisky.jpg',
      alt: 'Whiskytasting im Anglo-German Club',
      decorative: false,
    });
  });

});

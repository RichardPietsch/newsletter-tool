import { describe, expect, it } from 'vitest';
import { renderNewsletter } from '@/email/render-newsletter';
import { createBlock, createDefaultDocument } from '@/lib/newsletter/defaults';
import { validateNewsletterForExport } from '@/lib/newsletter/export-validation';
import { insertBlock } from '@/lib/newsletter/operations';
import { createDefaultSettings } from '@/lib/settings/defaults';
import type { ImageBlock, NewsletterDocument, TextBlock } from '@/lib/newsletter/schema';

const htmlSnippet = (html: string) =>
  html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\s+/g, ' ')
    .trim();

function richTextBlock(): TextBlock {
  return {
    ...(createBlock('text') as TextBlock),
    content: {
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Hauptüberschrift' }],
        },
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Intro mit ' },
            {
              type: 'text',
              text: 'Link',
              marks: [{ type: 'link', attrs: { href: 'https://example.com/events' } }],
            },
          ],
        },
        {
          type: 'heading',
          attrs: { level: 3 },
          content: [{ type: 'text', text: 'Unterüberschrift' }],
        },
      ],
    },
  };
}

function imageBlock(): ImageBlock {
  return {
    ...(createBlock('image') as ImageBlock),
    src: 'https://assets.example.com/newsletter/hero.jpg',
    alt: 'Clubabend im Ballsaal',
    decorative: false,
  };
}

function documentWithBlocks(blocks: Array<TextBlock | ImageBlock>): NewsletterDocument {
  return blocks.reduce(
    (document, block, index) => insertBlock(document, index + 1, block),
    createDefaultDocument('Export Test'),
  );
}

describe('MJML newsletter rendering', () => {
  it('renders a complete HTML document and keeps a stable structural shell snapshot', () => {
    const html = renderNewsletter(documentWithBlocks([richTextBlock()]));
    const normalized = htmlSnippet(html);

    expect(html.toLowerCase()).toContain('<!doctype html>');
    expect(html).toContain('<html lang="de"');
    expect(html).toContain('<head>');
    expect(html).toContain('<body');
    expect({
      doctype: normalized.startsWith('<!doctype html>'),
      lang: normalized.includes('<html lang="de"'),
      title: normalized.includes('<title>Export Test</title>'),
    }).toMatchInlineSnapshot(`
      {
        "doctype": true,
        "lang": true,
        "title": true,
      }
    `);
  });

  it('does not emit Tailwind utility classes or JavaScript artifacts', () => {
    const html = renderNewsletter(documentWithBlocks([richTextBlock(), imageBlock()]));

    expect(html).not.toMatch(/<script\b/i);
    expect(html).not.toMatch(/javascript:/i);
    expect(html).not.toMatch(/\b(?:flex|grid|items-center|justify-between|p-\d|px-\d|py-\d|text-sm|bg-white)\b/);
  });

  it('renders text module paragraphs, H2, H3 and links as email HTML', () => {
    const html = renderNewsletter(documentWithBlocks([richTextBlock()]));

    expect(html).toContain('<h2 style="margin:0 0 8px');
    expect(html).toContain('Hauptüberschrift</h2>');
    expect(html).toContain('<p style="margin:8px 0 12px;font-size:14px;line-height:1.8">Intro mit');
    expect(html).toContain('<a href="https://example.com/events">Link</a>');
    expect(html).toContain('<h3 style="margin:0 0 8px');
    expect(html).toContain('Unterüberschrift</h3>');
  });

  it('renders footer content from global settings', () => {
    const settings = createDefaultSettings();
    const html = renderNewsletter(documentWithBlocks([richTextBlock()]), settings);

    expect(html).toContain('office@anglogermanclub.de');
    expect(html).toContain('mailto:office@anglogermanclub.de');
    expect(html).toContain('Harvestehuder Weg 44');
  });

  it('keeps module gaps while preserving the seamless header-to-text transition', () => {
    const html = renderNewsletter(documentWithBlocks([richTextBlock(), imageBlock()]));

    expect(html.match(/height:32px;line-height:32px/g)).toHaveLength(2);
    expect(html).toContain('border-radius:0 0 4px 4px');
    expect(html).not.toContain('border-radius="4px"><mj-column border-radius="4px"><mj-text');
  });

  it('renders image module alt text', () => {
    const html = renderNewsletter(documentWithBlocks([imageBlock()]));

    expect(html).toContain('src="https://assets.example.com/newsletter/hero.jpg"');
    expect(html).toContain('alt="Clubabend im Ballsaal"');
  });

  it('blocks invalid, private and non-HTTPS images before export', () => {
    const privateImageDocument = documentWithBlocks([
      { ...imageBlock(), src: 'http://192.168.1.10/newsletter/hero.jpg' },
    ]);
    const nonHttpsDocument = documentWithBlocks([{ ...imageBlock(), src: 'http://example.com/newsletter/hero.jpg' }]);

    expect(validateNewsletterForExport(privateImageDocument, { mode: 'production' })).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'PRIVATE_IMAGE_URL' })]),
    );
    expect(validateNewsletterForExport(nonHttpsDocument, { mode: 'production' })).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'NON_HTTPS_IMAGE_URL' })]),
    );
  });
});

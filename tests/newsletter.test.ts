import { describe, expect, it } from 'vitest';
import { renderNewsletter } from '@/email/render-newsletter';
import { createBlock, createDefaultDocument } from '@/lib/newsletter/defaults';
import { deleteBlock, History, insertBlock, moveBlock, updateBlock } from '@/lib/newsletter/operations';
import { validateNewsletterForSave } from '@/lib/newsletter/save-validation';
import { allowedUrl, imageBlockSchema, newsletterDocumentSchema, tiptapDocSchema } from '@/lib/newsletter/schema';

describe('newsletter core', () => {
  it('validates block schemas and defaults', () => {
    const d = createDefaultDocument();
    expect(newsletterDocumentSchema.parse(d).blocks.map((b) => b.type)).toEqual(['header', 'footer']);
    expect(
      newsletterDocumentSchema.parse({ ...d, blocks: [{ ...d.blocks[0], headerVariantId: 'variant-1' }, d.blocks[1]] })
        .blocks[0].type,
    ).toBe('header');
    expect(
      imageBlockSchema.safeParse({ id: 'i', type: 'image', src: 'https://x.test/a.png', decorative: false }).success,
    ).toBe(false);
    expect(
      imageBlockSchema.safeParse({ id: 'i', type: 'image', src: 'https://x.test/a.png', decorative: true }).success,
    ).toBe(true);
  });

  it('inserts deletes and moves only content blocks', () => {
    let d = createDefaultDocument();
    const t = createBlock('text');
    d = insertBlock(d, 1, t);
    expect(d.blocks[1].id).toBe(t.id);
    expect(deleteBlock(d, d.blocks[0].id)).toBe(d);
    d = moveBlock(d, t.id, 1);
    expect(d.blocks[1].id).toBe(t.id);
    d = deleteBlock(d, t.id);
    expect(d.blocks).toHaveLength(2);
  });

  it('undo redo works', () => {
    const d = createDefaultDocument();
    const h = new History(d);
    const changed = insertBlock(d, 1, createBlock('event'));
    h.commit(changed);
    expect(h.undo().blocks).toHaveLength(2);
    expect(h.redo().blocks).toHaveLength(3);
    h.commit(updateBlock(changed, changed.blocks[1].id, { title: 'X' }));
    const updatedBlock = h.present.blocks[1];
    expect(updatedBlock.type === 'event' ? updatedBlock.title : undefined).toBe('X');
  });

  it('validates links', () => {
    expect(allowedUrl('https://example.com')).toBe(true);
    expect(allowedUrl('javascript:alert(1)')).toBe(false);
  });

  it('validates supported TipTap rich-text structures', () => {
    const result = tiptapDocSchema.safeParse({
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Headline', marks: [{ type: 'bold' }] }],
        },
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Mehr Informationen ', marks: [{ type: 'textStyle', attrs: { color: '#6d7478' } }] },
            {
              type: 'text',
              text: 'online',
              marks: [
                {
                  type: 'link',
                  attrs: { href: 'https://example.com', target: null, rel: 'noopener noreferrer nofollow' },
                },
              ],
            },
            { type: 'hardBreak' },
          ],
        },
        {
          type: 'bulletList',
          content: [{ type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Punkt' }] }] }],
        },
      ],
    });

    expect(result.success).toBe(true);
  });

  it('rejects unsupported TipTap nodes, unsafe links and unknown colors', () => {
    expect(
      tiptapDocSchema.safeParse({ type: 'doc', content: [{ type: 'image', attrs: { src: 'https://x.test/a.png' } }] })
        .success,
    ).toBe(false);
    expect(
      tiptapDocSchema.safeParse({
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'X', marks: [{ type: 'link', attrs: { href: 'javascript:alert(1)' } }] }],
          },
        ],
      }).success,
    ).toBe(false);
    expect(
      tiptapDocSchema.safeParse({
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'X', marks: [{ type: 'textStyle', attrs: { color: '#000000' } }] }],
          },
        ],
      }).success,
    ).toBe(false);
  });

  it('renders complete html without tailwind output', () => {
    let d = createDefaultDocument('Test');
    d = insertBlock(d, 1, createBlock('text'));
    const html = renderNewsletter(d);
    expect(html.toLowerCase()).toContain('<!doctype html>');
    expect(html).toContain('lang="de"');
    expect(html).toContain('<body');
    expect(html).not.toMatch(/class="(?:flex|p-|text-|bg-)/);
  });

  it('renders 32px gaps between exported modules except seamless header text connection', () => {
    let d = createDefaultDocument('Spacing Test');
    d = insertBlock(d, 1, createBlock('text'));
    d = insertBlock(d, 2, createBlock('event'));
    const html = renderNewsletter(d);

    expect(html).toContain('height:32px');
    expect(html.match(/height:32px/g)).toHaveLength(2);
  });

  it('reports missing required fields for autosave feedback', () => {
    const document = insertBlock(createDefaultDocument('Valid title'), 1, { ...createBlock('event'), title: '' });
    const issues = validateNewsletterForSave(document);

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ blockLabel: expect.stringContaining('Event'), fieldKey: 'title' }),
      ]),
    );
  });
});

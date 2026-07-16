import { describe, expect, it } from 'vitest';
import { renderNewsletter } from '@/email/render-newsletter';
import { createBlock, createDefaultDocument } from '@/lib/newsletter/defaults';
import { deleteBlock, History, insertBlock, moveBlock, updateBlock } from '@/lib/newsletter/operations';
import { validateNewsletterForSave } from '@/lib/newsletter/save-validation';
import { allowedUrl, imageBlockSchema, newsletterDocumentSchema } from '@/lib/newsletter/schema';

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
    h.commit(updateBlock(changed, changed.blocks[1].id, { title: 'X' } as any));
    expect((h.present.blocks[1] as any).title).toBe('X');
  });

  it('validates links', () => {
    expect(allowedUrl('https://example.com')).toBe(true);
    expect(allowedUrl('javascript:alert(1)')).toBe(false);
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

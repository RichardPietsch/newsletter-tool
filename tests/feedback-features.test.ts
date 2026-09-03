import { describe, expect, it } from 'vitest';
import { renderNewsletter } from '@/email/render-newsletter';
import { assetListFromPayload } from '@/lib/assets/list';
import { eventRecordToBlock, eventRecordToItem } from '@/lib/events/snapshot';
import type { EventRecord } from '@/lib/events/schema';
import { createBlock, createDefaultDocument } from '@/lib/newsletter/defaults';
import {
  insertBlock,
  insertBlockIntoBackground,
  moveBlockIntoBackground,
  removeBlockFromBackground,
} from '@/lib/newsletter/operations';
import {
  newsletterDocumentSchema,
  tiptapDocSchema,
  type EventBlock,
  type NewsletterContentBlock,
} from '@/lib/newsletter/schema';

function registerEvent(): EventRecord {
  return {
    id: 'event-register-1',
    tenantId: 'tenant-1',
    category: 'Clubabend',
    title: 'Die Zukunft des Handels',
    speakerName: 'Dr. Ada Beispiel',
    speakerRole: 'Vorständin für Innovation',
    date: '12. September, 19 Uhr',
    location: 'Ballsaal',
    description: 'Ein Gespräch über neue Märkte.',
    buttonLabel: 'Anmelden',
    buttonUrl: 'https://example.com/event',
    createdAt: '2026-08-26T10:00:00.000Z',
    updatedAt: '2026-08-26T10:00:00.000Z',
  };
}

describe('user-testing feedback features', () => {
  it('accepts the direct tenant-wide asset API response in the image picker', () => {
    const assets = [{ id: 'asset-1' }, { id: 'asset-2' }];
    expect(assetListFromPayload(assets)).toEqual(assets);
    expect(assetListFromPayload({ assets })).toEqual(assets);
  });

  it('creates independent event snapshots with a source reference', () => {
    const source = registerEvent();
    const item = eventRecordToItem(source, 'item-1');
    const localBlock = { ...(createBlock('event') as EventBlock), title: 'Lokaler Titel' };
    const patch = eventRecordToBlock(source, localBlock);

    expect(item).toMatchObject({ id: 'item-1', sourceEventId: source.id, title: source.title });
    expect(patch).toMatchObject({ sourceEventId: source.id, speakerRole: source.speakerRole });
    source.title = 'Später geänderter Registertitel';
    expect(item.title).toBe('Die Zukunft des Handels');
  });

  it('supports blockquotes in restricted rich text', () => {
    expect(
      tiptapDocSchema.safeParse({
        type: 'doc',
        content: [{ type: 'blockquote', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Zitat' }] }] }],
      }).success,
    ).toBe(true);
  });

  it('moves modules into and out of full-width background sections', () => {
    let document = createDefaultDocument('Hintergrund-Test');
    const text = createBlock('text');
    const background = createBlock('backgroundSection');
    document = insertBlock(document, 1, text);
    document = insertBlock(document, 2, background);
    document = moveBlockIntoBackground(document, text.id, background.id);

    const section = document.blocks.find((block) => block.id === background.id);
    expect(section?.type === 'backgroundSection' ? section.blocks.some((block) => block.id === text.id) : false).toBe(
      true,
    );

    document = removeBlockFromBackground(document, text.id);
    expect(document.blocks.some((block) => block.id === text.id)).toBe(true);
    expect(newsletterDocumentSchema.safeParse(document).success).toBe(true);
  });

  it('renders speaker metadata and a full-width highlighted background', () => {
    const event = {
      ...(createBlock('event') as EventBlock),
      ...eventRecordToBlock(registerEvent(), createBlock('event') as EventBlock),
    };
    const background = createBlock('backgroundSection');
    if (background.type !== 'backgroundSection') throw new Error('Hintergrundbereich erwartet');
    const section = { ...background, background: 'blue' as const, blocks: [event as NewsletterContentBlock] };
    const document = insertBlock(createDefaultDocument('Export'), 1, section);
    const html = renderNewsletter(document);

    expect(html).toContain('Dr. Ada Beispiel · Vorständin für Innovation');
    expect(html).toContain('width="100%"');
    expect(html).toContain('Die Zukunft des Handels');
  });

  it('can insert additional modules into a background section', () => {
    let document = insertBlock(createDefaultDocument('Insert'), 1, createBlock('backgroundSection'));
    const section = document.blocks[1];
    if (section.type !== 'backgroundSection') throw new Error('Hintergrundbereich erwartet');
    document = insertBlockIntoBackground(document, section.id, 1, createBlock('quote') as NewsletterContentBlock);
    const updated = document.blocks[1];
    expect(updated.type === 'backgroundSection' ? updated.blocks.map((block) => block.type) : []).toEqual([
      'text',
      'quote',
    ]);
  });
});

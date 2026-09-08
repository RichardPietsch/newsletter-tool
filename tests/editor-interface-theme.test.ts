import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { EventBlock } from '@/components/blocks/event-block';
import { EventGridBlock } from '@/components/blocks/event-grid-block';
import { FeaturedEventBlock } from '@/components/blocks/featured-event-block';
import { LockedGlobalBadge } from '@/components/editor/locked-global-badge';
import { createBlock } from '@/lib/newsletter/defaults';
import type {
  EventBlock as EventBlockData,
  EventGridBlock as EventGridBlockData,
  FeaturedEventBlock as FeaturedEventBlockData,
} from '@/lib/newsletter/schema';
import { newsletterModuleStyles } from '@/lib/newsletter/module-styles';

describe('newsletter editor theme boundary', () => {
  it('marks the global-lock hint as editor UI with explicit interface colors', () => {
    const html = renderToStaticMarkup(createElement(LockedGlobalBadge));

    expect(html).toContain('data-editor-ui="locked-global"');
    expect(html).toContain('newsletter-editor-ui');
    expect(html).toContain('bg-slate-100');
    expect(html).toContain('text-slate-600');
  });

  it('previews all newsletter call-to-action buttons with the shared subtle radius', () => {
    const event = {
      ...(createBlock('event') as EventBlockData),
      buttonLabel: 'Anmelden',
      buttonUrl: 'https://example.com/event',
    };
    const featuredEvent = {
      ...(createBlock('featuredEvent') as FeaturedEventBlockData),
      buttonUrl: 'https://example.com/featured-event',
    };
    const eventGrid = createBlock('eventGrid') as EventGridBlockData;
    eventGrid.items = eventGrid.items.map((item) => ({
      ...item,
      buttonUrl: 'https://example.com/event-grid',
    }));

    for (const html of [
      renderToStaticMarkup(createElement(EventBlock, { block: event })),
      renderToStaticMarkup(createElement(FeaturedEventBlock, { block: featuredEvent })),
      renderToStaticMarkup(createElement(EventGridBlock, { block: eventGrid })),
    ]) {
      expect(html).toContain(`border-radius:${newsletterModuleStyles.buttonRadius}px`);
    }
  });
});

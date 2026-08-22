import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { LockedGlobalBadge } from '@/components/editor/locked-global-badge';

describe('newsletter editor theme boundary', () => {
  it('marks the global-lock hint as editor UI with explicit interface colors', () => {
    const html = renderToStaticMarkup(createElement(LockedGlobalBadge));

    expect(html).toContain('data-editor-ui="locked-global"');
    expect(html).toContain('newsletter-editor-ui');
    expect(html).toContain('bg-slate-100');
    expect(html).toContain('text-slate-600');
  });
});

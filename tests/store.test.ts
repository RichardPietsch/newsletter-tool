import { beforeEach, describe, expect, it } from 'vitest';
import { createDefaultDocument } from '@/lib/newsletter/defaults';
import { initStore, resetStore, useNewsletterStore } from '@/lib/newsletter/store';

beforeEach(() => resetStore());

describe('newsletter editor store', () => {
  it('models the uninitialized state explicitly and guards actions', () => {
    const store = useNewsletterStore.getState();

    expect(store.initialized).toBe(false);
    expect(store.doc).toBeNull();
    expect(() => store.insert(1, 'text')).not.toThrow();
    expect(useNewsletterStore.getState().doc).toBeNull();
  });

  it('initializes documents and preserves undo redo behavior', () => {
    const document = createDefaultDocument('Store Test');
    initStore('newsletter-1', document);

    expect(useNewsletterStore.getState().initialized).toBe(true);
    expect(useNewsletterStore.getState().doc?.title).toBe('Store Test');

    useNewsletterStore.getState().insert(1, 'text');
    expect(useNewsletterStore.getState().doc?.blocks).toHaveLength(3);

    useNewsletterStore.getState().undo();
    expect(useNewsletterStore.getState().doc?.blocks).toHaveLength(2);

    useNewsletterStore.getState().redo();
    expect(useNewsletterStore.getState().doc?.blocks).toHaveLength(3);
  });
});

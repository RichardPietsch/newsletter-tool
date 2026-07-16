'use client';
import { create } from 'zustand';
import type { NewsletterDocument, NewsletterBlock } from './schema';
import { createBlock } from './defaults';
import { deleteBlock, insertBlock, moveBlock, updateBlock, History } from './operations';
type SaveStatus = 'saved' | 'saving' | 'error';
type S = {
  id: string;
  doc: NewsletterDocument;
  selectedId?: string;
  status: SaveStatus;
  history: History<NewsletterDocument>;
  setTitle: (t: string) => void;
  select: (id?: string) => void;
  insert: (
    i: number,
    t: 'text' | 'event' | 'image' | 'featuredEvent' | 'quote' | 'sectionHeading' | 'eventGrid',
  ) => void;
  delete: (id: string) => void;
  move: (id: string, d: -1 | 1) => void;
  update: (id: string, p: Partial<NewsletterBlock>) => void;
  undo: () => void;
  redo: () => void;
  setStatus: (s: SaveStatus) => void;
};
export const useNewsletterStore = create<S>((set, get) => ({
  id: '',
  doc: null as any,
  status: 'saved',
  history: null as any,
  setTitle: (title) => {
    const doc = { ...get().doc, title };
    get().history.commit(doc);
    set({ doc });
  },
  select: (selectedId) => set({ selectedId }),
  insert: (i, t) => {
    const b = createBlock(t);
    const doc = insertBlock(get().doc, i, b);
    get().history.commit(doc);
    set({ doc, selectedId: b.id });
  },
  delete: (id) => {
    const doc = deleteBlock(get().doc, id);
    get().history.commit(doc);
    set({ doc, selectedId: undefined });
  },
  move: (id, d) => {
    const doc = moveBlock(get().doc, id, d);
    get().history.commit(doc);
    set({ doc });
  },
  update: (id, p) => {
    const doc = updateBlock(get().doc, id, p);
    get().history.commit(doc);
    set({ doc });
  },
  undo: () => set({ doc: get().history.undo() }),
  redo: () => set({ doc: get().history.redo() }),
  setStatus: (status) => set({ status }),
}));
export function initStore(id: string, doc: NewsletterDocument) {
  useNewsletterStore.setState({ id, doc, history: new History(doc), selectedId: doc.blocks[0]?.id, status: 'saved' });
}

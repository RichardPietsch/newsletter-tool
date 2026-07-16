'use client';

import { create } from 'zustand';
import type { NewsletterBlockPatch, NewsletterDocument } from './schema';
import { createBlock } from './defaults';
import { deleteBlock, History, insertBlock, moveBlock, updateBlock } from './operations';

type SaveStatus = 'saved' | 'saving' | 'error';
type InsertableBlockType = 'text' | 'event' | 'image' | 'featuredEvent' | 'quote' | 'sectionHeading' | 'eventGrid';

type UninitializedState = {
  initialized: false;
  id: null;
  doc: null;
  selectedId?: undefined;
  history: null;
};

type InitializedState = {
  initialized: true;
  id: string;
  doc: NewsletterDocument;
  selectedId?: string;
  history: History<NewsletterDocument>;
};

type StoreData = UninitializedState | InitializedState;

type StoreActions = {
  status: SaveStatus;
  setTitle: (title: string) => void;
  select: (id?: string) => void;
  insert: (index: number, type: InsertableBlockType) => void;
  delete: (id: string) => void;
  move: (id: string, direction: -1 | 1) => void;
  update: (id: string, patch: NewsletterBlockPatch) => void;
  undo: () => void;
  redo: () => void;
  setStatus: (status: SaveStatus) => void;
};

type NewsletterStore = StoreData & StoreActions;

const uninitializedState: UninitializedState = {
  initialized: false,
  id: null,
  doc: null,
  selectedId: undefined,
  history: null,
};

function commitDocument(state: InitializedState, doc: NewsletterDocument) {
  state.history.commit(doc);
  return doc;
}

export const useNewsletterStore = create<NewsletterStore>((set, get) => ({
  ...uninitializedState,
  status: 'saved',
  setTitle: (title) => {
    const state = get();
    if (!state.initialized) return;
    const doc = commitDocument(state, { ...state.doc, title });
    set({ doc });
  },
  select: (selectedId) => {
    const state = get();
    if (!state.initialized) return;
    set({ selectedId });
  },
  insert: (index, type) => {
    const state = get();
    if (!state.initialized) return;
    const block = createBlock(type);
    const doc = commitDocument(state, insertBlock(state.doc, index, block));
    set({ doc, selectedId: block.id });
  },
  delete: (id) => {
    const state = get();
    if (!state.initialized) return;
    const doc = commitDocument(state, deleteBlock(state.doc, id));
    set({ doc, selectedId: undefined });
  },
  move: (id, direction) => {
    const state = get();
    if (!state.initialized) return;
    const doc = commitDocument(state, moveBlock(state.doc, id, direction));
    set({ doc });
  },
  update: (id, patch) => {
    const state = get();
    if (!state.initialized) return;
    const doc = commitDocument(state, updateBlock(state.doc, id, patch));
    set({ doc });
  },
  undo: () => {
    const state = get();
    if (!state.initialized) return;
    set({ doc: state.history.undo() });
  },
  redo: () => {
    const state = get();
    if (!state.initialized) return;
    set({ doc: state.history.redo() });
  },
  setStatus: (status) => set({ status }),
}));

export function initStore(id: string, doc: NewsletterDocument) {
  useNewsletterStore.setState({
    initialized: true,
    id,
    doc,
    history: new History(doc),
    selectedId: doc.blocks[0]?.id,
    status: 'saved',
  });
}

export function resetStore() {
  useNewsletterStore.setState({ ...uninitializedState, status: 'saved' });
}

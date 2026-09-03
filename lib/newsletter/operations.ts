import type { NewsletterBlock, NewsletterBlockPatch, NewsletterContentBlock, NewsletterDocument } from './schema';
import { isLocked } from './schema';
export function insertBlock(doc: NewsletterDocument, index: number, block: NewsletterBlock): NewsletterDocument {
  const safe = Math.max(1, Math.min(index, doc.blocks.length - 1));
  return { ...doc, blocks: [...doc.blocks.slice(0, safe), block, ...doc.blocks.slice(safe)] };
}
export function deleteBlock(doc: NewsletterDocument, id: string): NewsletterDocument {
  const b = doc.blocks.find((x) => x.id === id);
  if (b) {
    if (isLocked(b)) return doc;
    return { ...doc, blocks: doc.blocks.filter((x) => x.id !== id) };
  }
  return {
    ...doc,
    blocks: doc.blocks.map((block) => {
      if (block.type !== 'backgroundSection' || !block.blocks.some((child) => child.id === id)) return block;
      if (block.blocks.length === 1) return block;
      return { ...block, blocks: block.blocks.filter((child) => child.id !== id) };
    }),
  };
}
export function moveBlock(doc: NewsletterDocument, id: string, dir: -1 | 1): NewsletterDocument {
  const i = doc.blocks.findIndex((b) => b.id === id);
  if (i === -1) {
    return {
      ...doc,
      blocks: doc.blocks.map((block) => {
        if (block.type !== 'backgroundSection') return block;
        const childIndex = block.blocks.findIndex((child) => child.id === id);
        const target = childIndex + dir;
        if (childIndex === -1 || target < 0 || target >= block.blocks.length) return block;
        const blocks = [...block.blocks];
        [blocks[childIndex], blocks[target]] = [blocks[target], blocks[childIndex]];
        return { ...block, blocks };
      }),
    };
  }
  if (i < 1 || i >= doc.blocks.length - 1 || isLocked(doc.blocks[i])) return doc;
  const j = i + dir;
  if (j < 1 || j >= doc.blocks.length - 1) return doc;
  const blocks = [...doc.blocks];
  [blocks[i], blocks[j]] = [blocks[j], blocks[i]];
  return { ...doc, blocks };
}
export function updateBlock(doc: NewsletterDocument, id: string, patch: NewsletterBlockPatch): NewsletterDocument {
  return {
    ...doc,
    blocks: doc.blocks.map((block) => {
      if (block.id === id) return { ...block, ...patch } as NewsletterBlock;
      if (block.type !== 'backgroundSection') return block;
      return {
        ...block,
        blocks: block.blocks.map((child) =>
          child.id === id ? ({ ...child, ...patch } as NewsletterContentBlock) : child,
        ),
      };
    }),
  };
}

export function findNewsletterBlock(doc: NewsletterDocument, id?: string): NewsletterBlock | undefined {
  if (!id) return undefined;
  for (const block of doc.blocks) {
    if (block.id === id) return block;
    if (block.type === 'backgroundSection') {
      const child = block.blocks.find((entry) => entry.id === id);
      if (child) return child;
    }
  }
  return undefined;
}

export function backgroundParentId(doc: NewsletterDocument, id?: string) {
  if (!id) return undefined;
  return doc.blocks.find((block) => block.type === 'backgroundSection' && block.blocks.some((child) => child.id === id))
    ?.id;
}

export function insertBlockIntoBackground(
  doc: NewsletterDocument,
  backgroundId: string,
  index: number,
  block: NewsletterContentBlock,
): NewsletterDocument {
  return {
    ...doc,
    blocks: doc.blocks.map((entry) => {
      if (entry.type !== 'backgroundSection' || entry.id !== backgroundId) return entry;
      const safe = Math.max(0, Math.min(index, entry.blocks.length));
      return { ...entry, blocks: [...entry.blocks.slice(0, safe), block, ...entry.blocks.slice(safe)] };
    }),
  };
}

export function removeBlockFromBackground(doc: NewsletterDocument, id: string): NewsletterDocument {
  const parentIndex = doc.blocks.findIndex(
    (block) => block.type === 'backgroundSection' && block.blocks.some((child) => child.id === id),
  );
  if (parentIndex === -1) return doc;
  const parent = doc.blocks[parentIndex];
  if (parent.type !== 'backgroundSection') return doc;
  const child = parent.blocks.find((block) => block.id === id);
  if (!child) return doc;
  const blocks = [...doc.blocks];
  if (parent.blocks.length === 1) blocks.splice(parentIndex, 1, child);
  else {
    blocks[parentIndex] = { ...parent, blocks: parent.blocks.filter((block) => block.id !== id) };
    blocks.splice(parentIndex + 1, 0, child);
  }
  return { ...doc, blocks };
}

export function moveBlockIntoBackground(doc: NewsletterDocument, id: string, backgroundId: string): NewsletterDocument {
  const sourceIndex = doc.blocks.findIndex((block) => block.id === id);
  const source = doc.blocks[sourceIndex];
  if (
    sourceIndex < 1 ||
    !source ||
    source.type === 'header' ||
    source.type === 'footer' ||
    source.type === 'backgroundSection'
  )
    return doc;
  const remaining = doc.blocks.filter((block) => block.id !== id);
  if (!remaining.some((block) => block.type === 'backgroundSection' && block.id === backgroundId)) return doc;
  return {
    ...doc,
    blocks: remaining.map((block) =>
      block.type === 'backgroundSection' && block.id === backgroundId
        ? { ...block, blocks: [...block.blocks, source] }
        : block,
    ),
  };
}
export class History<T> {
  past: T[] = [];
  future: T[] = [];
  constructor(
    public present: T,
    private limit = 50,
  ) {}
  commit(v: T) {
    this.past = [...this.past, this.present].slice(-this.limit);
    this.present = v;
    this.future = [];
  }
  undo() {
    const v = this.past.pop();
    if (v) {
      this.future.unshift(this.present);
      this.present = v;
    }
    return this.present;
  }
  redo() {
    const v = this.future.shift();
    if (v) {
      this.past.push(this.present);
      this.present = v;
    }
    return this.present;
  }
}

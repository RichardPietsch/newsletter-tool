import type { NewsletterBlock, NewsletterBlockPatch, NewsletterDocument } from './schema';
import { isLocked } from './schema';
export function insertBlock(doc: NewsletterDocument, index: number, block: NewsletterBlock): NewsletterDocument {
  const safe = Math.max(1, Math.min(index, doc.blocks.length - 1));
  return { ...doc, blocks: [...doc.blocks.slice(0, safe), block, ...doc.blocks.slice(safe)] };
}
export function deleteBlock(doc: NewsletterDocument, id: string): NewsletterDocument {
  const b = doc.blocks.find((x) => x.id === id);
  if (!b || isLocked(b)) return doc;
  return { ...doc, blocks: doc.blocks.filter((x) => x.id !== id) };
}
export function moveBlock(doc: NewsletterDocument, id: string, dir: -1 | 1): NewsletterDocument {
  const i = doc.blocks.findIndex((b) => b.id === id);
  if (i < 1 || i >= doc.blocks.length - 1 || isLocked(doc.blocks[i])) return doc;
  const j = i + dir;
  if (j < 1 || j >= doc.blocks.length - 1) return doc;
  const blocks = [...doc.blocks];
  [blocks[i], blocks[j]] = [blocks[j], blocks[i]];
  return { ...doc, blocks };
}
export function updateBlock(doc: NewsletterDocument, id: string, patch: NewsletterBlockPatch): NewsletterDocument {
  return { ...doc, blocks: doc.blocks.map((b) => (b.id === id ? ({ ...b, ...patch } as NewsletterBlock) : b)) };
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

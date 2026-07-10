'use client';

import { useNewsletterStore } from '@/lib/newsletter/store';

export function UndoRedoControls({ disabled = false }: { disabled?: boolean }) {
  const undo = useNewsletterStore((state) => state.undo);
  const redo = useNewsletterStore((state) => state.redo);
  return (
    <div className="flex gap-2">
      <button className="rounded border px-3 py-1 disabled:cursor-not-allowed disabled:text-slate-400" disabled={disabled} onClick={undo}>Undo</button>
      <button className="rounded border px-3 py-1 disabled:cursor-not-allowed disabled:text-slate-400" disabled={disabled} onClick={redo}>Redo</button>
    </div>
  );
}

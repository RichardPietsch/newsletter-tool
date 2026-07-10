'use client'; import { useNewsletterStore } from '@/lib/newsletter/store';
export function UndoRedoControls(){const undo=useNewsletterStore(s=>s.undo), redo=useNewsletterStore(s=>s.redo); return <div className="flex gap-2"><button className="rounded border px-3 py-1" onClick={undo}>Undo</button><button className="rounded border px-3 py-1" onClick={redo}>Redo</button></div>}

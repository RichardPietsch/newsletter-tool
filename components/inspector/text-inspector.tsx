'use client';

import type { TextBlock as TextBlockType } from '@/lib/newsletter/schema';
import { useNewsletterStore } from '@/lib/newsletter/store';

export function TextInspector() {
  const doc = useNewsletterStore((state) => state.doc);
  const selectedId = useNewsletterStore((state) => state.selectedId);
  const update = useNewsletterStore((state) => state.update);
  const block = doc.blocks.find((item) => item.id === selectedId && item.type === 'text') as TextBlockType | undefined;

  return (
    <div className="space-y-3">
      <h2 className="font-bold">Textmodul</h2>
      <p className="text-sm text-slate-600">Bearbeite den Text direkt im Newsletter-Canvas. So siehst du Überschriften, Hervorhebungen und Listen unmittelbar im Layout.</p>
      {block ? (
        <label className="block text-sm font-medium">Hintergrund
          <select className="mt-1 w-full rounded border p-2" value={block.background ?? 'white'} onChange={(event) => update(block.id, { background: event.target.value as TextBlockType['background'] } as any)}>
            <option value="white">Standard · Weiß</option>
            <option value="blue">Blau · Feature-Teaser</option>
          </select>
        </label>
      ) : null}
      <p className="rounded border border-blue-100 bg-blue-50 p-3 text-sm text-blue-900">Wähle Text im Canvas aus und nutze die Symbol-Toolbar oberhalb des Textmoduls für Absatz, H2, H3, Fett, Kursiv, Unterstreichen, Textfarbe sowie Listen.</p>
      <p className="text-xs text-slate-500">Rot und Grau sind nur für einzelne Hervorhebungen vorgesehen; Layout, Abstände und Schriftgrößen bleiben systemdefiniert.</p>
    </div>
  );
}

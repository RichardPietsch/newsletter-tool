'use client';

import { useState } from 'react';
import type { ImageBlock } from '@/lib/newsletter/schema';
import { AssetPickerDialog } from './asset-picker-dialog';

type Asset = {
  id: string;
  publicUrl: string;
  originalFilename: string;
  title?: string | null;
  altText?: string | null;
};

export function ImageInspector({ block, onChange }: { block: ImageBlock; onChange: (patch: Partial<ImageBlock>) => void }) {
  const [pickerOpen, setPickerOpen] = useState(false);

  function selectAsset(asset: Asset) {
    onChange({
      assetId: asset.id,
      src: asset.publicUrl,
      alt: block.alt || asset.altText || asset.title || asset.originalFilename.replace(/\.[^.]+$/, ''),
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-bold">Bildmodul</h2>
        <p className="text-sm text-slate-600">Wähle ein Bild aus der Medienbibliothek aus oder lade im Dialog ein neues JPEG, PNG oder GIF hoch.</p>
      </div>
      <button type="button" className="rounded bg-blue-700 px-4 py-2 text-sm text-white" onClick={() => setPickerOpen(true)}>Bild auswählen</button>
      {block.src ? <img src={block.src} alt={block.decorative ? '' : block.alt || ''} className="max-h-40 w-full rounded border object-contain" /> : <p className="rounded border border-dashed p-4 text-sm text-slate-600">Noch kein Bild ausgewählt.</p>}
      <label className="block text-sm font-medium">Alternativtext
        <input className="mt-1 w-full rounded border p-2" value={block.alt || ''} disabled={block.decorative} onChange={(event) => onChange({ alt: event.target.value })} />
      </label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={block.decorative} onChange={(event) => onChange({ decorative: event.target.checked, alt: event.target.checked ? '' : block.alt })} /> Dekoratives Bild</label>
      <label className="block text-sm font-medium">Optionale Ziel-URL
        <input className="mt-1 w-full rounded border p-2" value={block.href || ''} onChange={(event) => onChange({ href: event.target.value })} placeholder="https://…" />
      </label>
      <details className="text-sm text-slate-600">
        <summary>Manuelle Bild-URL anzeigen</summary>
        <input className="mt-2 w-full rounded border p-2" value={block.src || ''} onChange={(event) => onChange({ src: event.target.value })} />
      </details>
      <AssetPickerDialog open={pickerOpen} onClose={() => setPickerOpen(false)} onSelect={selectAsset} />
    </div>
  );
}

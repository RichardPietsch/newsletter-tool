'use client';

import { useState } from 'react';
import type { ImageBlock } from '@/lib/newsletter/schema';

export function ImageInspector({ block, onChange }: { block: ImageBlock; onChange: (patch: Partial<ImageBlock>) => void }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string>();

  async function upload(file: File) {
    setUploading(true);
    setError(undefined);
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch('/api/assets', { method: 'POST', body: formData });
    setUploading(false);

    if (!response.ok) {
      const payload = await response.json().catch(() => ({ error: 'Upload fehlgeschlagen.' }));
      setError(payload.error ?? 'Upload fehlgeschlagen.');
      return;
    }

    const asset = await response.json();
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
        <p className="text-sm text-slate-600">Lade JPEG, PNG oder GIF hoch. Bilder werden serverseitig auf maximal 600 px Breite skaliert.</p>
      </div>
      <label className="inline-flex cursor-pointer rounded bg-blue-700 px-4 py-2 text-sm text-white">
        {uploading ? 'Upload läuft …' : 'Bild hochladen'}
        <input className="sr-only" type="file" accept="image/jpeg,image/png,image/gif" onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file); }} />
      </label>
      {error ? <p className="rounded border border-red-200 bg-red-50 p-2 text-sm text-red-700" role="alert">{error}</p> : null}
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
    </div>
  );
}

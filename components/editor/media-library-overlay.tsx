'use client';

import { t } from '@/lib/i18n';

import { useEffect, useState } from 'react';
import { Overlay } from './overlay';

type Asset = {
  id: string;
  publicUrl: string;
  originalFilename: string;
  title: string | null;
  altText: string | null;
  width: number;
  height: number;
  sizeBytes: number;
};

export function MediaLibraryOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'saving' | 'error'>('idle');

  useEffect(() => {
    if (!open) return;
    setStatus('loading');
    fetch('/api/assets')
      .then((response) => response.json())
      .then((data) => {
        setAssets(data);
        setStatus('idle');
      })
      .catch(() => setStatus('error'));
  }, [open]);

  async function updateAsset(id: string, patch: { title?: string | null; altText?: string | null }) {
    const current = assets.find((asset) => asset.id === id);
    if (!current) return;
    const payload = { id, title: patch.title ?? current.title ?? '', altText: patch.altText ?? current.altText ?? '' };
    setStatus('saving');
    const response = await fetch('/api/assets', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    setStatus(response.ok ? 'idle' : 'error');
  }

  if (!open) return null;

  return (
    <Overlay title={t('misc.mediaTitle')} onClose={onClose}>
      <div className="p-6">
        <div className="mb-4 flex items-center justify-between gap-4">
          <p className="text-sm text-slate-600">{t('misc.mediaLibraryIntro')}</p>
          <p aria-live="polite" className="text-sm text-slate-500">
            {status === 'loading' ? 'Lade Medien …' : status === 'saving' ? 'Speichere …' : status === 'error' ? 'Fehler beim Speichern oder Laden' : `${assets.length} Medien`}
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {assets.map((asset) => (
            <article key={asset.id} className="rounded-xl border bg-white p-4 shadow-sm">
              <img src={asset.publicUrl} alt={asset.altText || asset.title || asset.originalFilename} className="h-44 w-full rounded bg-slate-100 object-contain" />
              <p className="mt-2 text-xs text-slate-500">{asset.width}×{asset.height}px · {Math.round(asset.sizeBytes / 1024)} KB</p>
              <label className="mt-3 block text-sm font-medium">
                Titel
                <input
                  className="mt-1 w-full rounded border p-2"
                  value={asset.title ?? ''}
                  onChange={(event) => setAssets((items) => items.map((item) => item.id === asset.id ? { ...item, title: event.target.value } : item))}
                  onBlur={(event) => void updateAsset(asset.id, { title: event.target.value })}
                />
              </label>
              <label className="mt-3 block text-sm font-medium">{t('image.alt')}<textarea
                  className="mt-1 min-h-20 w-full rounded border p-2"
                  value={asset.altText ?? ''}
                  onChange={(event) => setAssets((items) => items.map((item) => item.id === asset.id ? { ...item, altText: event.target.value } : item))}
                  onBlur={(event) => void updateAsset(asset.id, { altText: event.target.value })}
                />
              </label>
            </article>
          ))}
          {assets.length === 0 && status !== 'loading' ? (
            <p className="rounded border border-dashed bg-white p-6 text-slate-600">{t('misc.emptyMediaLibrary')}</p>
          ) : null}
        </div>
      </div>
    </Overlay>
  );
}

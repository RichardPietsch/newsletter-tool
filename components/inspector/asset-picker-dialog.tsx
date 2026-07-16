'use client';

import { t } from '@/lib/i18n';

import { useEffect, useState } from 'react';
import { Overlay } from '@/components/editor/overlay';
import { getApiErrorMessage } from '@/lib/api/error-message';

type Asset = {
  id: string;
  publicUrl: string;
  originalFilename: string;
  title?: string | null;
  altText?: string | null;
};

export function AssetPickerDialog({ open, onClose, onSelect }: { open: boolean; onClose: () => void; onSelect: (asset: Asset) => void }) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!open) return;
    let active = true;
    setLoading(true);
    setError(undefined);
    fetch('/api/assets')
      .then((response) => response.ok ? response.json() : Promise.reject(new Error('Medien konnten nicht geladen werden.')))
      .then((payload) => { if (active) setAssets(payload.assets ?? []); })
      .catch((err: Error) => { if (active) setError(err.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [open]);

  async function upload(file: File) {
    setUploading(true);
    setError(undefined);
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch('/api/assets', { method: 'POST', body: formData });
    setUploading(false);

    if (!response.ok) {
      const payload = await response.json().catch(() => ({ error: 'Upload fehlgeschlagen.' }));
      setError(getApiErrorMessage(payload, 'Upload fehlgeschlagen.'));
      return;
    }

    const asset = await response.json() as Asset;
    setAssets((current) => [asset, ...current]);
    onSelect(asset);
    onClose();
  }

  if (!open) return null;

  return (
    <Overlay title={t('image.choose')} onClose={onClose}>
      <div className="space-y-4 p-6">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-slate-600">{t('misc.assetPickerIntro')}</p>
          <label className="shrink-0 cursor-pointer rounded bg-blue-700 px-4 py-2 text-sm font-medium text-white">
            {uploading ? 'Upload läuft …' : 'Bild hochladen'}
            <input className="sr-only" type="file" accept="image/jpeg,image/png,image/gif" onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file); }} />
          </label>
        </div>
        {error ? <p className="rounded border border-red-200 bg-red-50 p-2 text-sm text-red-700" role="alert">{error}</p> : null}
        {loading ? <p className="text-sm text-slate-600">{t('misc.mediaLoading')}</p> : null}
        {!loading && assets.length === 0 ? <p className="rounded border border-dashed p-4 text-sm text-slate-600">{t('misc.noMedia')}</p> : null}
        <div className="grid grid-cols-2 gap-3">
          {assets.map((asset) => (
            <button key={asset.id} className="overflow-hidden rounded border bg-white text-left hover:border-blue-600" onClick={() => { onSelect(asset); onClose(); }}>
              <img src={asset.publicUrl} alt={asset.altText ?? ''} className="h-32 w-full object-cover" />
              <span className="block truncate px-3 py-2 text-sm font-medium">{asset.title || asset.originalFilename}</span>
            </button>
          ))}
        </div>
      </div>
    </Overlay>
  );
}

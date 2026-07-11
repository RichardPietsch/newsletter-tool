'use client';

import { useState } from 'react';
import type { NewsletterSaveIssue } from '@/lib/newsletter/save-validation';
import type { FeaturedEventBlock } from '@/lib/newsletter/schema';
import { AssetPickerDialog } from './asset-picker-dialog';

type Asset = {
  id: string;
  publicUrl: string;
  originalFilename: string;
  title?: string | null;
  altText?: string | null;
};

function Field({ label, value, onChange, required = false, invalid = false }: { label: string; value?: string; onChange: (value: string) => void; required?: boolean; invalid?: boolean }) {
  return <label className="block text-sm font-medium">{label}{required ? ' *' : ''}<input className={`mt-1 w-full rounded border p-2 ${invalid ? 'border-red-500 outline outline-2 outline-red-500' : ''}`} value={value || ''} onChange={(event) => onChange(event.target.value)} /></label>;
}

function Area({ label, value, onChange, required = false, invalid = false }: { label: string; value?: string; onChange: (value: string) => void; required?: boolean; invalid?: boolean }) {
  return <label className="block text-sm font-medium">{label}{required ? ' *' : ''}<textarea className={`mt-1 w-full rounded border p-2 ${invalid ? 'border-red-500 outline outline-2 outline-red-500' : ''}`} value={value || ''} onChange={(event) => onChange(event.target.value)} /></label>;
}

export function FeaturedEventInspector({ block, onChange, validationIssues = [] }: { block: FeaturedEventBlock; onChange: (patch: Partial<FeaturedEventBlock>) => void; validationIssues?: NewsletterSaveIssue[] }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const hasIssue = (field: string) => validationIssues.some((issue) => issue.fieldKey === field);

  function selectAsset(asset: Asset) {
    onChange({
      image: {
        assetId: asset.id,
        src: asset.publicUrl,
        alt: block.image?.alt || asset.altText || asset.title || asset.originalFilename.replace(/\.[^.]+$/, ''),
        decorative: false,
      },
    });
  }

  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium">Hintergrund
        <select className="mt-1 w-full rounded border p-2" value={block.background ?? 'blue'} onChange={(event) => onChange({ background: event.target.value as FeaturedEventBlock['background'] })}>
          <option value="blue">Dunkelblau</option>
          <option value="white">Weiß</option>
        </select>
      </label>
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <strong className="text-sm">Bild</strong>
          <button type="button" className="rounded bg-blue-700 px-3 py-2 text-sm text-white" onClick={() => setPickerOpen(true)}>Bild auswählen</button>
        </div>
        {block.image?.src ? <img src={block.image.src} alt={block.image.decorative ? '' : block.image.alt || ''} className="max-h-40 w-full rounded border object-contain" /> : <p className="rounded border border-dashed p-4 text-sm text-slate-600">Noch kein Bild ausgewählt.</p>}
        <label className="block text-sm font-medium">Alternativtext{block.image?.decorative ? '' : ' *'}
          <input className={`mt-1 w-full rounded border p-2 ${hasIssue('image.alt') ? 'border-red-500 outline outline-2 outline-red-500' : ''}`} value={block.image?.alt || ''} disabled={block.image?.decorative} onChange={(event) => onChange({ image: { ...(block.image || { decorative: false }), alt: event.target.value } })} />
        </label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={block.image?.decorative ?? false} onChange={(event) => onChange({ image: { ...(block.image || { src: '', decorative: false }), decorative: event.target.checked, alt: event.target.checked ? '' : block.image?.alt } })} /> Dekoratives Bild</label>
        <details className="text-sm text-slate-600">
          <summary>Manuelle Bild-URL anzeigen</summary>
          <input className="mt-2 w-full rounded border p-2" value={block.image?.src || ''} onChange={(event) => onChange({ image: { ...(block.image || { decorative: false }), src: event.target.value } })} />
        </details>
      </div>
      <Field label="Overline" value={block.overline} onChange={(overline) => onChange({ overline })} />
      <Field label="Titel" value={block.title} required invalid={hasIssue('title')} onChange={(title) => onChange({ title })} />
      <Field label="Datum / Uhrzeit" value={block.date} onChange={(date) => onChange({ date })} />
      <Area label="Beschreibung" value={block.description} onChange={(description) => onChange({ description })} />
      <Field label="Button-Label" value={block.buttonLabel} required={Boolean(block.buttonUrl)} invalid={hasIssue('buttonLabel')} onChange={(buttonLabel) => onChange({ buttonLabel })} />
      <Field label="Button-URL" value={block.buttonUrl} onChange={(buttonUrl) => onChange({ buttonUrl })} />
      <AssetPickerDialog open={pickerOpen} onClose={() => setPickerOpen(false)} onSelect={selectAsset} />
    </div>
  );
}

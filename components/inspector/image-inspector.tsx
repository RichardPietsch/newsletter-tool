'use client';

import { useState } from 'react';
import { t } from '@/lib/i18n';
import type { NewsletterSaveIssue } from '@/lib/newsletter/save-validation';
import type { ImageBlock } from '@/lib/newsletter/schema';
import { AssetPickerDialog } from './asset-picker-dialog';

type Asset = {
  id: string;
  publicUrl: string;
  originalFilename: string;
  title?: string | null;
  altText?: string | null;
};

export function ImageInspector({
  block,
  onChange,
  validationIssues = [],
}: {
  block: ImageBlock;
  onChange: (patch: Partial<ImageBlock>) => void;
  validationIssues?: NewsletterSaveIssue[];
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const hasIssue = (field: string) => validationIssues.some((issue) => issue.fieldKey === field);

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
        <h2 className="font-bold">{t('image.moduleTitle')}</h2>
        <p className="text-sm text-slate-600">{t('image.description')}</p>
      </div>
      <button
        type="button"
        className="rounded bg-blue-700 px-4 py-2 text-sm text-white"
        onClick={() => setPickerOpen(true)}
      >
        {t('image.choose')}
      </button>
      {block.src ? (
        <img src={block.src} alt={block.alt || ''} className="max-h-40 w-full rounded border object-contain" />
      ) : (
        <p className="rounded border border-dashed p-4 text-sm text-slate-600">{t('image.none')}</p>
      )}
      <label className="block text-sm font-medium">
        {t('image.alt')}
        {block.src ? ' *' : ''}
        <input
          className={`mt-1 w-full rounded border p-2 ${hasIssue('alt') ? 'border-red-500 outline outline-2 outline-red-500' : ''}`}
          value={block.alt || ''}
          required={Boolean(block.src)}
          onChange={(event) => onChange({ alt: event.target.value })}
        />
      </label>
      <AssetPickerDialog open={pickerOpen} onClose={() => setPickerOpen(false)} onSelect={selectAsset} />
    </div>
  );
}

'use client';

import { useState } from 'react';
import { t } from '@/lib/i18n';
import type { NewsletterSaveIssue } from '@/lib/newsletter/save-validation';
import type { BackgroundSectionBlock } from '@/lib/newsletter/schema';
import type { GlobalSettings } from '@/lib/settings/schema';
import { AssetPickerDialog } from './asset-picker-dialog';

type Asset = {
  id: string;
  publicUrl: string;
  originalFilename: string;
  title?: string | null;
  altText?: string | null;
};

export function BackgroundSectionInspector({
  block,
  settings,
  issues = [],
  onChange,
}: {
  block: BackgroundSectionBlock;
  settings?: GlobalSettings;
  issues?: NewsletterSaveIssue[];
  onChange: (patch: Partial<BackgroundSectionBlock>) => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const currentVariantId =
    block.sectionHeader?.source === 'headerVariant' ? block.sectionHeader.headerVariantId : undefined;
  const currentVariant = settings?.headerVariants.find((variant) => variant.id === currentVariantId);
  const allowedVariants = settings?.headerVariants.filter((variant) => variant.usableAsSectionHeader) ?? [];
  const selectableVariants = currentVariant?.usableAsSectionHeader
    ? allowedVariants
    : currentVariant
      ? [currentVariant, ...allowedVariants]
      : allowedVariants;
  const selectValue = block.sectionHeader
    ? block.sectionHeader.source === 'asset'
      ? 'asset'
      : `variant:${block.sectionHeader.headerVariantId}`
    : 'none';
  const assetHeader = block.sectionHeader?.source === 'asset' ? block.sectionHeader : undefined;
  const altInvalid = issues.some((issue) => issue.fieldKey === 'sectionHeader.alt');

  function selectAsset(asset: Asset) {
    onChange({
      sectionHeader: {
        source: 'asset',
        assetId: asset.id,
        src: asset.publicUrl,
        alt: asset.altText || asset.title || asset.originalFilename.replace(/\.[^.]+$/, ''),
      },
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-bold">{t('misc.backgroundSection')}</h2>
        <p className="text-sm text-slate-600">{t('misc.backgroundSectionIntro')}</p>
      </div>
      <label className="block text-sm font-medium">
        {t('misc.layout')}
        <select
          className="mt-1 w-full rounded border p-2"
          value={block.background}
          onChange={(event) => onChange({ background: event.target.value as BackgroundSectionBlock['background'] })}
        >
          <option value="neutral">{t('misc.light')}</option>
          <option value="blue">{t('misc.dark')}</option>
        </select>
      </label>
      <div className="border-t pt-4">
        <label className="block text-sm font-medium">
          {t('misc.sectionHeader')}
          <select
            className="mt-1 w-full rounded border bg-white p-2"
            value={selectValue}
            onChange={(event) => {
              const value = event.target.value;
              if (value === 'none') onChange({ sectionHeader: undefined });
              else if (value === 'asset') setPickerOpen(true);
              else onChange({ sectionHeader: { source: 'headerVariant', headerVariantId: value.slice(8) } });
            }}
          >
            <option value="none">{t('misc.noSectionHeader')}</option>
            {selectableVariants.map((variant) => (
              <option key={variant.id} value={`variant:${variant.id}`}>
                {variant.name}
                {!variant.usableAsSectionHeader ? ` · ${t('misc.sectionHeaderNoLongerAvailable')}` : ''}
              </option>
            ))}
            {currentVariantId && !currentVariant ? (
              <option value={`variant:${currentVariantId}`}>
                {currentVariantId} · {t('misc.sectionHeaderNoLongerAvailable')}
              </option>
            ) : null}
            <option value="asset">{t('misc.chooseSectionHeaderImage')}</option>
          </select>
        </label>
        <p className="mt-1 text-xs text-slate-500">{t('misc.sectionHeaderIntro')}</p>
      </div>
      {assetHeader ? (
        <div className="space-y-3 rounded border bg-slate-50 p-3">
          <img src={assetHeader.src} alt={assetHeader.alt} className="max-h-32 w-full object-contain" />
          <label className="block text-sm font-medium">
            {t('image.alt')} *
            <input
              className={`mt-1 w-full rounded border p-2 ${altInvalid ? 'border-red-500 outline outline-2 outline-red-500' : ''}`}
              value={assetHeader.alt}
              required
              onChange={(event) => onChange({ sectionHeader: { ...assetHeader, alt: event.target.value } })}
            />
          </label>
          <button
            type="button"
            className="rounded border bg-white px-3 py-2 text-sm"
            onClick={() => setPickerOpen(true)}
          >
            {t('misc.changeSectionHeaderImage')}
          </button>
        </div>
      ) : null}
      <AssetPickerDialog open={pickerOpen} onClose={() => setPickerOpen(false)} onSelect={selectAsset} />
    </div>
  );
}

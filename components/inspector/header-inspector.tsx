'use client';

import { t } from '@/lib/i18n';

import type { HeaderBlock } from '@/lib/newsletter/schema';
import type { GlobalSettings } from '@/lib/settings/schema';

export function HeaderInspector({
  block,
  settings,
  onChange,
}: {
  block: HeaderBlock;
  settings?: GlobalSettings;
  onChange: (patch: Partial<HeaderBlock>) => void;
}) {
  const variants = settings?.headerVariants ?? [];
  const selectedVariantId =
    variants.find((variant) => variant.id === block.headerVariantId)?.id ?? variants[0]?.id ?? '';

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-bold">{t('misc.header')}</h2>
        <p className="text-sm text-slate-600">{t('misc.headerInspectorIntro')}</p>
      </div>
      <label className="block text-sm font-medium">
        Header-Variante
        <select
          className="mt-2 w-full rounded border p-2"
          value={selectedVariantId}
          disabled={variants.length === 0}
          onChange={(event) => onChange({ headerVariantId: event.target.value })}
        >
          {variants.map((variant) => (
            <option key={variant.id} value={variant.id}>
              {variant.name}
            </option>
          ))}
        </select>
      </label>
      {(settings?.headerVariants.length ?? 0) === 0 && (
        <p className="rounded border border-dashed p-3 text-sm text-slate-600">
          {t('misc.noHeaderVariantsConfigured')}
        </p>
      )}
    </div>
  );
}

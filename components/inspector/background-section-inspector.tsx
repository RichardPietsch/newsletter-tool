'use client';

import { t } from '@/lib/i18n';
import type { BackgroundSectionBlock } from '@/lib/newsletter/schema';

export function BackgroundSectionInspector({
  block,
  onChange,
}: {
  block: BackgroundSectionBlock;
  onChange: (patch: Partial<BackgroundSectionBlock>) => void;
}) {
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
          <option value="neutral">{t('misc.backgroundNeutral')}</option>
          <option value="blue">{t('misc.backgroundBlue')}</option>
        </select>
      </label>
    </div>
  );
}

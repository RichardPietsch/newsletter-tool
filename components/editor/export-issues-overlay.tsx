'use client';

import { t } from '@/lib/i18n';

import type { ExportValidationIssue } from '@/lib/newsletter/export-validation';
import { Overlay } from './overlay';

export function ExportIssuesOverlay({
  open,
  error,
  issues,
  onClose,
}: {
  open: boolean;
  error: string;
  issues: ExportValidationIssue[];
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <Overlay title={t('export.impossible')} onClose={onClose}>
      <div className="space-y-5 p-6">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-950">
          <p className="font-semibold">{error}</p>
          <p className="mt-2 text-sm">{t('export.fixIssues')}</p>
        </div>
        <ul className="space-y-3">
          {issues.map((issue) => (
            <li key={`${issue.blockId}-${issue.path}-${issue.code}`} className="rounded-xl border bg-white p-4 shadow-sm">
              <p className="font-medium text-slate-950">{issue.message}</p>
              <p className="mt-1 text-sm text-slate-600">
                {t('export.module')}: <span className="font-mono">{issue.blockType}</span>{t('misc.fieldSeparator')}<span className="font-mono">{issue.path}</span>
              </p>
            </li>
          ))}
        </ul>
        <p className="text-sm text-slate-600">{t('export.tip')}<span className="font-mono">PUBLIC_ASSET_BASE_URL</span>{t('export.productionAssetUrl')}</p>
      </div>
    </Overlay>
  );
}

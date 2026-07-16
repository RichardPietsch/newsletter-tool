'use client';

import { t } from '@/lib/i18n';
import type { ExportValidationIssue } from '@/lib/newsletter/export-validation';
import type { GlobalSettings } from '@/lib/settings/schema';
import { AccountOverlay } from './account-overlay';
import type { AccountInfo, EditorOverlay } from './editor-types';
import { ExportIssuesOverlay } from './export-issues-overlay';
import { MediaLibraryOverlay } from './media-library-overlay';
import { NewsletterSettingsOverlay } from './newsletter-settings-overlay';
import { Overlay } from './overlay';
import { SettingsOverlay } from './settings-overlay';

export function EditorOverlays({
  overlay,
  settings,
  account,
  usedHeaderVariantIds,
  title,
  sentAt,
  exportError,
  exportIssues,
  onCloseOverlay,
  onRename,
  onToggleSent,
  onClone,
  onDelete,
  onHtmlExport,
  onTemplateExport,
  onCloseExportError,
}: {
  overlay: EditorOverlay;
  settings?: GlobalSettings;
  account: AccountInfo;
  usedHeaderVariantIds: string[];
  title: string;
  sentAt: string | null;
  exportError: string | null;
  exportIssues: ExportValidationIssue[];
  onCloseOverlay: () => void;
  onRename: (title: string) => Promise<void>;
  onToggleSent: () => Promise<void>;
  onClone: () => Promise<void>;
  onDelete: () => Promise<void>;
  onHtmlExport: () => Promise<void>;
  onTemplateExport: () => Promise<void>;
  onCloseExportError: () => void;
}) {
  return (
    <>
      <MediaLibraryOverlay open={overlay === 'media'} onClose={onCloseOverlay} />
      {settings ? (
        <SettingsOverlay
          open={overlay === 'settings'}
          onClose={onCloseOverlay}
          settings={settings}
          usedHeaderVariantIds={usedHeaderVariantIds}
        />
      ) : null}
      <AccountOverlay open={overlay === 'account'} onClose={onCloseOverlay} account={account} />
      <NewsletterSettingsOverlay
        open={overlay === 'newsletter'}
        title={title}
        sentAt={sentAt}
        onClose={onCloseOverlay}
        onRename={onRename}
        onToggleSent={onToggleSent}
        onClone={onClone}
        onDelete={onDelete}
      />
      {overlay === 'export' ? (
        <Overlay title={t('export.dialogTitle')} onClose={onCloseOverlay}>
          <div className="mx-auto max-w-xl space-y-4 p-6">
            <p className="text-sm text-slate-600">{t('export.dialogIntro')}</p>
            <button
              type="button"
              className="block w-full rounded border bg-white p-4 text-left transition hover:border-blue-600 hover:bg-blue-50"
              onClick={() => {
                onCloseOverlay();
                void onHtmlExport();
              }}
            >
              <span className="block font-semibold">{t('export.html')}</span>
              <span className="text-sm text-slate-600">{t('export.htmlDescription')}</span>
            </button>
            <button
              type="button"
              className="block w-full rounded border bg-white p-4 text-left transition hover:border-blue-600 hover:bg-blue-50"
              onClick={() => {
                onCloseOverlay();
                void onTemplateExport();
              }}
            >
              <span className="block font-semibold">{t('export.yml')}</span>
              <span className="text-sm text-slate-600">{t('export.ymlDescription')}</span>
            </button>
          </div>
        </Overlay>
      ) : null}
      <ExportIssuesOverlay
        open={exportError !== null}
        error={exportError ?? ''}
        issues={exportIssues}
        onClose={onCloseExportError}
      />
    </>
  );
}

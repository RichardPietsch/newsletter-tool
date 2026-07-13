'use client';

import { t } from '@/lib/i18n';

import { useEffect, useState } from 'react';
import { Overlay } from './overlay';

export function NewsletterSettingsOverlay({
  open,
  title,
  sentAt,
  onClose,
  onRename,
  onToggleSent,
  onClone,
  onDelete,
}: {
  open: boolean;
  title: string;
  sentAt: string | null;
  onClose: () => void;
  onRename: (title: string) => Promise<void>;
  onToggleSent: () => Promise<void>;
  onClone: () => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [draftTitle, setDraftTitle] = useState(title);
  const [status, setStatus] = useState<'idle' | 'saving' | 'error'>('idle');

  useEffect(() => setDraftTitle(title), [title, open]);

  if (!open) return null;
  const isSent = Boolean(sentAt);

  async function saveTitle() {
    setStatus('saving');
    try {
      await onRename(draftTitle);
      setStatus('idle');
    } catch {
      setStatus('error');
    }
  }

  return (
    <Overlay title={t('misc.newsletterSettingsTitle')} onClose={onClose}>
      <div className="space-y-8 p-6">
        {isSent ? (
          <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-900">
            {t('misc.sentStatusDescription')}
          </div>
        ) : null}
        <section className="rounded-xl bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold">{t('misc.name')}</h3>
          <p className="text-sm text-slate-600">{t('misc.newsletterNameIntro')}</p>
          <div className="mt-4 flex gap-3">
            <input className="min-w-0 flex-1 rounded border p-2" value={draftTitle} disabled={isSent} onChange={(event) => setDraftTitle(event.target.value)} />
            <button type="button" className="rounded bg-blue-700 px-4 py-2 text-white disabled:cursor-not-allowed disabled:bg-slate-300" disabled={isSent || !draftTitle.trim() || status === 'saving'} onClick={() => void saveTitle()}>{t('newsletterSettings.save')}</button>
          </div>
          {status === 'error' ? <p className="mt-2 text-sm text-red-700">{t('misc.newsletterNameSaveFailed')}</p> : null}
        </section>
        <section className="rounded-xl bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold">{t('misc.status')}</h3>
          <p className="text-sm text-slate-600">{t('misc.sentReadonlyHint')}</p>
          <button type="button" className={isSent ? 'mt-4 rounded border border-slate-600 px-4 py-2 text-slate-700' : 'mt-4 rounded border border-green-700 px-4 py-2 text-green-800'} onClick={() => void onToggleSent()}>
            {isSent ? t('newsletterSettings.unmarkSent') : t('newsletterSettings.markSent')}
          </button>
        </section>
        <section className="rounded-xl bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold">{t('misc.cloneNewsletter')}</h3>
          <p className="text-sm text-slate-600">{t('misc.cloneNewsletterDescription')}</p>
          <button type="button" className="mt-4 rounded bg-blue-700 px-4 py-2 text-white" onClick={() => void onClone()}>{t('misc.cloneNewsletter')}</button>
        </section>
        <section className="rounded-xl bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-red-800">{t('newsletterSettings.delete')}</h3>
          <p className="text-sm text-slate-600">{t('misc.deleteNewsletterDescription')}</p>
          <button type="button" className="mt-4 rounded bg-red-700 px-4 py-2 text-white" onClick={() => void onDelete()}>{t('newsletterSettings.delete')}</button>
        </section>
      </div>
    </Overlay>
  );
}

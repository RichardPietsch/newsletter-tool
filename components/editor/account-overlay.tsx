'use client';

import { t } from '@/lib/i18n/ui-text';
import { Overlay } from './overlay';

type AccountInfo = {
  email: string;
  lastLoginAt: string | null;
};

export function AccountOverlay({ open, onClose, account }: { open: boolean; onClose: () => void; account: AccountInfo }) {
  if (!open) return null;
  return (
    <Overlay title={t('account.title')} onClose={onClose}>
      <div className="mx-auto max-w-xl p-6">
        <dl className="rounded-xl bg-white p-5 shadow-sm">
          <dt className="text-sm text-slate-500">{t('account.email')}</dt>
          <dd className="font-medium">{account.email}</dd>
          <dt className="mt-4 text-sm text-slate-500">{t('account.lastLogin')}</dt>
          <dd>{account.lastLoginAt ? new Date(account.lastLoginAt).toLocaleString('de-DE') : '—'}</dd>
        </dl>
        <a href="/logout" className="mt-6 inline-block rounded border px-4 py-2 text-red-700 hover:bg-red-50">{t('account.logout')}</a>
      </div>
    </Overlay>
  );
}

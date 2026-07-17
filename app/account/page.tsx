import { t } from '@/lib/i18n';
export const dynamic = 'force-dynamic';
import { requirePageUser } from '@/lib/auth/current-user';
export default async function AccountPage() {
  const user = await requirePageUser();
  return (
    <main className="mx-auto max-w-xl p-8">
      <h1 className="text-3xl font-bold">{t('account.title')}</h1>
      <dl className="mt-6 rounded bg-white p-4">
        <dt className="text-sm text-slate-500">{t('account.email')}</dt>
        <dd className="font-medium">{user.email}</dd>
        <dt className="mt-4 text-sm text-slate-500">{t('account.lastLogin')}</dt>
        <dd>{user.lastLoginAt?.toLocaleString('de-DE') || '—'}</dd>
      </dl>
      <a href="/logout" className="mt-6 inline-block rounded border px-4 py-2 text-red-700">
        {t('account.logout')}
      </a>
    </main>
  );
}

import { t } from '@/lib/i18n';
export default function CheckEmailPage() {
  return (
    <main className="mx-auto max-w-md p-8">
      <h1 className="text-3xl font-bold">{t('misc.checkInbox')}</h1>
      <p className="mt-3 text-slate-600">{t('misc.checkInboxIntro')}</p>
      <a className="mt-6 inline-block text-blue-700" href="/login">{t('misc.useOtherEmail')}</a>
    </main>
  );
}

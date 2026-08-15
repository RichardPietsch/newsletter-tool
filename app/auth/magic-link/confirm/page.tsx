export const dynamic = 'force-dynamic';
import { t } from '@/lib/i18n';

export default async function ConfirmMagicLinkPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const validShape = typeof token === 'string' && token.length >= 32 && token.length <= 256;
  return (
    <main className="mx-auto max-w-md p-8">
      <meta name="referrer" content="no-referrer" />
      <h1 className="text-3xl font-bold">{t('admin.confirmLoginTitle')}</h1>
      {validShape ? (
        <>
          <p className="mt-3 text-slate-600">{t('admin.confirmLoginIntro')}</p>
          <form action="/auth/magic-link/verify" method="post" className="mt-6">
            <input type="hidden" name="token" value={token} />
            <button className="rounded bg-blue-700 px-4 py-2 text-white">{t('admin.confirmLoginButton')}</button>
          </form>
        </>
      ) : (
        <p className="mt-4 rounded border border-red-200 bg-red-50 p-3 text-red-700">
          {t('admin.invalidLoginLink')}
        </p>
      )}
    </main>
  );
}

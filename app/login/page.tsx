import { t } from '@/lib/i18n';
import { LoginForm } from './login-form';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  return (
    <main className="mx-auto max-w-md p-8">
      <h1 className="text-3xl font-bold">{t('misc.loginTitle')}</h1>
      <p className="mt-2 text-slate-600">{t('misc.loginIntro')}</p>
      {params.error ? (
        <p className="mt-4 rounded border border-red-200 bg-red-50 p-3 text-red-700">{t('misc.invalidLink')}</p>
      ) : null}
      <LoginForm />
    </main>
  );
}

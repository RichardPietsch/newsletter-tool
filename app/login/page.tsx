import { LoginForm } from './login-form';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  return (
    <main className="mx-auto max-w-md p-8">
      <h1 className="text-3xl font-bold">Anmelden</h1>
      <p className="mt-2 text-slate-600">Gib deine E-Mail-Adresse ein. Wir senden dir einen einmaligen Zugangslink.</p>
      {params.error ? (
        <p className="mt-4 rounded border border-red-200 bg-red-50 p-3 text-red-700">Der Link ist ungültig oder abgelaufen.</p>
      ) : null}
      <LoginForm />
    </main>
  );
}

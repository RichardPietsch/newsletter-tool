'use client';

import { t } from '@/lib/i18n';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    const response = await fetch('/api/auth/magic-link/request', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    setIsSubmitting(false);
    if (!response.ok) {
      setError(t('misc.invalidEmail'));
      return;
    }
    router.push('/auth/check-email');
  }

  return (
    <form className="mt-6 space-y-4" onSubmit={submit}>
      <label className="block text-sm font-medium">
        {t('account.email')}
        <input
          name="email"
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="mt-1 w-full rounded border p-2"
          autoComplete="email"
        />
      </label>
      {error ? <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
      <button disabled={isSubmitting} className="rounded bg-blue-700 px-4 py-2 text-white disabled:opacity-60">
        {isSubmitting ? t('misc.sendingLink') : t('misc.sendLoginLink')}
      </button>
    </form>
  );
}

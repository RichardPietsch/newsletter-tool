'use client';

import { useState } from 'react';
import type { NewsletterSaveIssue } from '@/lib/newsletter/save-validation';
import { useNewsletterStore } from '@/lib/newsletter/store';
import { Overlay } from './overlay';

export function SaveStatus({ issues = [] }: { issues?: NewsletterSaveIssue[] }) {
  const status = useNewsletterStore((state) => state.status);
  const [open, setOpen] = useState(false);
  const hasIssues = issues.length > 0;

  return (
    <div aria-live="polite" className="flex items-center gap-2 text-sm text-slate-600">
      <span>{status === 'saved' ? 'Gespeichert' : status === 'saving' ? 'Speichern …' : 'Speichern fehlgeschlagen'}</span>
      {status === 'error' && hasIssues ? (
        <button type="button" className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-red-300 bg-red-50 text-red-700" aria-label="Speicherfehler anzeigen" onClick={() => setOpen(true)}>
          <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true"><path fill="currentColor" d="M1 21h22L12 2 1 21Zm12-3h-2v-2h2v2Zm0-4h-2v-4h2v4Z" /></svg>
        </button>
      ) : null}
      {open ? (
        <Overlay title="Speichern nicht erfolgreich" onClose={() => setOpen(false)}>
          <div className="mx-auto max-w-2xl space-y-4 p-6">
            <p className="text-sm text-slate-600">Bitte korrigiere die folgenden Felder, damit der Newsletter zwischengespeichert werden kann.</p>
            <ul className="space-y-3">
              {issues.map((issue, index) => (
                <li key={`${issue.path}-${index}`} className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-900">
                  <strong className="block">{issue.blockLabel}</strong>
                  <span>{issue.message}</span>
                </li>
              ))}
            </ul>
          </div>
        </Overlay>
      ) : null}
    </div>
  );
}

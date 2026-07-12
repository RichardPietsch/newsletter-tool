'use client';

import { t } from '@/lib/i18n';

import type { ReactNode } from 'react';
import { useEffect } from 'react';

export function Overlay({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/40 p-6" role="dialog" aria-modal="true" aria-label={title}>
      <div className="mx-auto flex h-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-slate-50 shadow-2xl">
        <header className="flex items-center justify-between border-b bg-white px-6 py-4">
          <h2 className="text-xl font-semibold">{title}</h2>
          <button type="button" onClick={onClose} className="rounded border px-3 py-1 text-sm hover:bg-slate-50" aria-label={`${title} schließen`}>{t('shared.close')}</button>
        </header>
        <div className="flex-1 overflow-auto">{children}</div>
      </div>
    </div>
  );
}

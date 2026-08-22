'use client';

import { t } from '@/lib/i18n';
export function InsertionPoint({ index, onOpen }: { index: number; onOpen: (i: number) => void }) {
  return (
    <button
      data-tour="add-module"
      data-editor-ui="insertion-point"
      aria-label={t('editor.addComponentHere')}
      onClick={() => onOpen(index)}
      className="newsletter-editor-ui group relative my-3 flex w-full items-center justify-center py-3 text-slate-700"
    >
      <span className="absolute h-0.5 w-full bg-slate-300 group-hover:bg-blue-600" />
      <span className="z-10 rounded-full border bg-white px-2 py-0.5 text-lg text-slate-700 group-hover:border-blue-600 group-hover:text-blue-700">
        +
      </span>
    </button>
  );
}

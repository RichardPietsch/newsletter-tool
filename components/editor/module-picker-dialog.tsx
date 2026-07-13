'use client';

import { t } from '@/lib/i18n';

import * as Dialog from '@radix-ui/react-dialog';
import { useEffect } from 'react';

type ModuleType = 'text' | 'event' | 'image' | 'featuredEvent' | 'quote' | 'sectionHeading' | 'eventGrid';

export function ModulePickerDialog({ open, onOpenChange, onPick }: { open: boolean; onOpenChange: (value: boolean) => void; onPick: (type: ModuleType) => void }) {
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const cards = [
    ['text', 'Text', 'Rich-Text mit Überschriften und Listen'],
    ['featuredEvent', 'Featured Event', 'Prominente Veranstaltung mit optionalem Bild und CTA'],
    ['quote', 'Zitat', 'Editoriales Zitat mit roter Akzentlinie'],
    ['sectionHeading', 'Abschnitt', 'Kleine rote Abschnittsüberschrift'],
    ['eventGrid', 'Event-Raster', 'Mehrere Events im flexiblen Kartenraster'],
    ['image', 'Bild', 'Inhaltliches oder dekoratives Bild'],
  ] as const;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[100] bg-slate-950/50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[101] w-[720px] max-w-[90vw] -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-8 shadow-xl">
          <Dialog.Title className="text-2xl font-bold">{t('misc.addModule')}</Dialog.Title>
          <div className="mt-6 grid grid-cols-3 gap-4">
            {cards.map((card) => (
              <button key={card[0]} onClick={() => onPick(card[0])} className="rounded-lg border p-5 text-left hover:border-blue-600 focus:border-blue-600">
                <div className="text-3xl">{card[0] === 'text' ? '¶' : card[0] === 'featuredEvent' ? '★' : card[0] === 'quote' ? '“' : card[0] === 'sectionHeading' ? '—' : card[0] === 'eventGrid' ? '▦' : '🖼️'}</div>
                <div className="mt-3 font-semibold">{card[1]}</div>
                <p className="text-sm text-slate-600">{card[2]}</p>
              </button>
            ))}
          </div>
          <Dialog.Close className="mt-6 rounded border px-4 py-2">{t('shared.close')}</Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

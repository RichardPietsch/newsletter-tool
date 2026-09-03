'use client';

import { useEffect, useState } from 'react';
import { Overlay } from '@/components/editor/overlay';
import { t } from '@/lib/i18n';
import type { EventRecord } from '@/lib/events/schema';

export function EventPickerDialog({
  open,
  onClose,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (event: EventRecord) => void;
}) {
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    let active = true;
    setLoading(true);
    fetch('/api/events')
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error())))
      .then((payload: EventRecord[]) => {
        if (active) setEvents(payload);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [open]);

  if (!open) return null;

  return (
    <Overlay title={t('misc.chooseEvent')} onClose={onClose}>
      <div className="mx-auto max-w-4xl space-y-4 p-6">
        <p className="text-sm text-slate-600">{t('misc.eventSnapshotHint')}</p>
        {loading ? <p className="text-sm text-slate-600">{t('save.saving')}</p> : null}
        {!loading && events.length === 0 ? (
          <p className="rounded border border-dashed p-5 text-sm text-slate-600">{t('misc.noEvents')}</p>
        ) : null}
        <div className="grid gap-3 md:grid-cols-2">
          {events.map((event) => (
            <button
              key={event.id}
              type="button"
              className="rounded-lg border bg-white p-4 text-left hover:border-blue-600 hover:bg-blue-50"
              onClick={() => {
                onSelect(event);
                onClose();
              }}
            >
              <span className="block text-xs font-bold uppercase tracking-wider text-red-700">{event.category}</span>
              <span className="mt-1 block font-semibold text-slate-950">{event.title}</span>
              {event.speakerName ? (
                <span className="mt-1 block text-sm text-slate-600">
                  {[event.speakerName, event.speakerRole].filter(Boolean).join(' · ')}
                </span>
              ) : null}
              <span className="mt-2 block text-xs text-slate-500">
                {[event.date, event.location].filter(Boolean).join(' · ')}
              </span>
            </button>
          ))}
        </div>
      </div>
    </Overlay>
  );
}

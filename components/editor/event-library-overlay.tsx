'use client';

import { useCallback, useEffect, useState } from 'react';
import type { EventInput, EventRecord } from '@/lib/events/schema';
import { t } from '@/lib/i18n';
import { AssetPickerDialog } from '@/components/inspector/asset-picker-dialog';
import { Overlay } from './overlay';

type Asset = {
  id: string;
  publicUrl: string;
  originalFilename: string;
  title?: string | null;
  altText?: string | null;
};

const emptyEvent: EventInput = {
  category: 'Veranstaltung',
  title: '',
  speakerName: '',
  speakerRole: '',
  date: '',
  location: '',
  description: '',
  buttonLabel: '',
  buttonUrl: '',
};

function Input({
  label,
  value,
  onChange,
  required = false,
}: {
  label: string;
  value?: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  return (
    <label className="block text-sm font-medium">
      {label}
      {required ? ' *' : ''}
      <input
        className="mt-1 w-full rounded border p-2"
        value={value ?? ''}
        required={required}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

export function EventLibraryOverlay({
  open,
  onClose,
  readOnly = false,
}: {
  open: boolean;
  onClose: () => void;
  readOnly?: boolean;
}) {
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [draft, setDraft] = useState<EventInput>(emptyEvent);
  const [editingId, setEditingId] = useState<string>();
  const [status, setStatus] = useState<'idle' | 'loading' | 'saving' | 'error'>('idle');
  const [assetPickerOpen, setAssetPickerOpen] = useState(false);

  const load = useCallback(async () => {
    setStatus('loading');
    const response = await fetch('/api/events');
    if (!response.ok) {
      setStatus('error');
      return;
    }
    setEvents(await response.json());
    setStatus('idle');
  }, []);

  useEffect(() => {
    if (open) void load();
  }, [load, open]);

  function startNew() {
    setEditingId(undefined);
    setDraft(emptyEvent);
  }

  function startEdit(event: EventRecord) {
    const { id: _id, tenantId: _tenantId, createdAt: _createdAt, updatedAt: _updatedAt, ...input } = event;
    setEditingId(event.id);
    setDraft(input);
  }

  async function save() {
    if (readOnly || !draft.title.trim()) return;
    setStatus('saving');
    const response = await fetch('/api/events', {
      method: editingId ? 'PUT' : 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(editingId ? { id: editingId, ...draft } : draft),
    });
    if (!response.ok) {
      setStatus('error');
      return;
    }
    const saved = (await response.json()) as EventRecord;
    setEvents((current) =>
      editingId ? current.map((event) => (event.id === saved.id ? saved : event)) : [saved, ...current],
    );
    setEditingId(saved.id);
    const { id: _id, tenantId: _tenantId, createdAt: _createdAt, updatedAt: _updatedAt, ...savedInput } = saved;
    setDraft(savedInput);
    setStatus('idle');
  }

  async function remove(event: EventRecord) {
    if (readOnly || !window.confirm(t('misc.confirmDeleteEvent'))) return;
    const response = await fetch('/api/events', {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: event.id }),
    });
    if (!response.ok) {
      setStatus('error');
      return;
    }
    setEvents((current) => current.filter((item) => item.id !== event.id));
    if (editingId === event.id) startNew();
  }

  function selectAsset(asset: Asset) {
    setDraft((current) => ({
      ...current,
      image: {
        assetId: asset.id,
        src: asset.publicUrl,
        alt: current.image?.alt || asset.altText || asset.title || asset.originalFilename.replace(/\.[^.]+$/, ''),
        decorative: false,
      },
    }));
  }

  if (!open) return null;

  return (
    <Overlay title={t('misc.eventsTitle')} onClose={onClose}>
      <div className="grid min-h-full lg:grid-cols-[minmax(18rem,0.8fr)_minmax(24rem,1.2fr)]">
        <section className="border-r bg-white p-6">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm text-slate-600">{t('misc.eventLibraryIntro')}</p>
            {!readOnly ? (
              <button
                type="button"
                className="shrink-0 rounded bg-blue-700 px-3 py-2 text-sm text-white"
                onClick={startNew}
              >
                {t('misc.newEvent')}
              </button>
            ) : null}
          </div>
          {status === 'loading' ? <p className="mt-4 text-sm text-slate-500">{t('save.saving')}</p> : null}
          <div className="mt-5 space-y-2">
            {events.map((event) => (
              <article
                key={event.id}
                className={`rounded border p-3 ${editingId === event.id ? 'border-blue-600 bg-blue-50' : ''}`}
              >
                <button type="button" className="w-full text-left" onClick={() => startEdit(event)}>
                  <span className="block text-xs font-bold uppercase tracking-wider text-red-700">
                    {event.category}
                  </span>
                  <span className="block font-semibold">{event.title}</span>
                  <span className="block text-xs text-slate-500">
                    {[event.date, event.location].filter(Boolean).join(' · ')}
                  </span>
                </button>
                {!readOnly ? (
                  <button type="button" className="mt-2 text-xs text-red-700" onClick={() => void remove(event)}>
                    {t('misc.deleteEvent')}
                  </button>
                ) : null}
              </article>
            ))}
            {events.length === 0 && status !== 'loading' ? (
              <p className="rounded border border-dashed p-4 text-sm text-slate-600">{t('misc.noEvents')}</p>
            ) : null}
          </div>
        </section>

        <section className="space-y-4 p-6">
          <h3 className="text-lg font-semibold">{editingId ? t('misc.editEvent') : t('misc.newEvent')}</h3>
          <fieldset disabled={readOnly} className="grid gap-4 md:grid-cols-2">
            <Input
              label={t('misc.category')}
              value={draft.category}
              onChange={(category) => setDraft({ ...draft, category })}
            />
            <Input
              label={t('misc.talkTitle')}
              value={draft.title}
              required
              onChange={(title) => setDraft({ ...draft, title })}
            />
            <Input
              label={t('misc.speakerName')}
              value={draft.speakerName}
              onChange={(speakerName) => setDraft({ ...draft, speakerName })}
            />
            <Input
              label={t('misc.speakerRole')}
              value={draft.speakerRole}
              onChange={(speakerRole) => setDraft({ ...draft, speakerRole })}
            />
            <Input label={t('misc.dateTime')} value={draft.date} onChange={(date) => setDraft({ ...draft, date })} />
            <Input
              label={t('misc.place')}
              value={draft.location}
              onChange={(location) => setDraft({ ...draft, location })}
            />
            <label className="block text-sm font-medium md:col-span-2">
              {t('misc.description')}
              <textarea
                className="mt-1 min-h-28 w-full rounded border p-2"
                value={draft.description ?? ''}
                onChange={(event) => setDraft({ ...draft, description: event.target.value })}
              />
            </label>
            <Input
              label={t('misc.buttonLabel')}
              value={draft.buttonLabel}
              onChange={(buttonLabel) => setDraft({ ...draft, buttonLabel })}
            />
            <Input
              label={t('misc.buttonUrl')}
              value={draft.buttonUrl}
              onChange={(buttonUrl) => setDraft({ ...draft, buttonUrl })}
            />
          </fieldset>

          <div className="rounded border bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <strong className="text-sm">{t('misc.image')}</strong>
              {!readOnly ? (
                <button
                  type="button"
                  className="rounded border px-3 py-2 text-sm"
                  onClick={() => setAssetPickerOpen(true)}
                >
                  {t('image.choose')}
                </button>
              ) : null}
            </div>
            {draft.image?.src ? (
              <img
                src={draft.image.src}
                alt={draft.image.alt ?? ''}
                className="mt-3 max-h-48 w-full rounded object-contain"
              />
            ) : null}
          </div>

          {status === 'error' ? <p className="text-sm text-red-700">{t('save.failed')}</p> : null}
          {!readOnly ? (
            <button
              type="button"
              className="rounded bg-blue-700 px-4 py-2 text-white disabled:opacity-50"
              disabled={!draft.title.trim() || status === 'saving'}
              onClick={() => void save()}
            >
              {status === 'saving' ? t('save.saving') : t('misc.saveEvent')}
            </button>
          ) : null}
        </section>
      </div>
      <AssetPickerDialog open={assetPickerOpen} onClose={() => setAssetPickerOpen(false)} onSelect={selectAsset} />
    </Overlay>
  );
}

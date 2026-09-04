'use client';

import { useEffect, useState } from 'react';
import type { EventRecord } from '@/lib/events/schema';
import { t } from '@/lib/i18n';

type UpdateStatus = 'idle' | 'saving' | 'saved' | 'error';

export function EventSourceControl({
  sourceEventId,
  updateKey,
  events,
  loading,
  loadFailed,
  onSelect,
  onCustom,
  onUpdate,
}: {
  sourceEventId?: string;
  updateKey: string;
  events: EventRecord[];
  loading: boolean;
  loadFailed: boolean;
  onSelect: (event: EventRecord) => void;
  onCustom: () => void;
  onUpdate: () => Promise<boolean>;
}) {
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>('idle');
  const sourceExists = Boolean(sourceEventId && events.some((event) => event.id === sourceEventId));
  const sourceMissing = Boolean(sourceEventId && !loading && !sourceExists);

  useEffect(() => {
    setUpdateStatus('idle');
  }, [sourceEventId, updateKey]);

  async function updateRegister() {
    setUpdateStatus('saving');
    const saved = await onUpdate();
    setUpdateStatus(saved ? 'saved' : 'error');
  }

  return (
    <div className="space-y-2 rounded border bg-slate-50 p-3">
      <label className="block text-sm font-medium">
        {t('misc.eventSource')}
        <select
          className="mt-1 w-full rounded border bg-white p-2"
          value={sourceEventId ?? ''}
          disabled={loading}
          onChange={(event) => {
            setUpdateStatus('idle');
            if (!event.target.value) {
              onCustom();
              return;
            }
            const selected = events.find((entry) => entry.id === event.target.value);
            if (selected) onSelect(selected);
          }}
        >
          <option value="">{t('misc.customEvent')}</option>
          {sourceMissing ? <option value={sourceEventId}>{t('misc.missingRegisterEvent')}</option> : null}
          {events.map((event) => (
            <option key={event.id} value={event.id}>
              {[event.title, event.date].filter(Boolean).join(' · ')}
            </option>
          ))}
        </select>
      </label>
      {loading ? <p className="text-xs text-slate-500">{t('misc.loadingEventRegister')}</p> : null}
      {loadFailed ? <p className="text-xs text-red-700">{t('misc.eventRegisterLoadFailed')}</p> : null}
      {!loading && !loadFailed ? (
        <p className="text-xs text-slate-500">
          {sourceEventId ? t('misc.registeredEventHint') : t('misc.customEventHint')}
        </p>
      ) : null}
      {sourceEventId ? (
        <button
          type="button"
          className={`w-full rounded px-3 py-2 text-sm font-medium text-white disabled:opacity-50 ${
            updateStatus === 'saved' ? 'bg-green-700' : 'bg-blue-700'
          }`}
          disabled={updateStatus === 'saving' || sourceMissing || loadFailed}
          aria-live="polite"
          onClick={() => void updateRegister()}
        >
          {updateStatus === 'saving'
            ? t('save.saving')
            : updateStatus === 'saved'
              ? t('misc.registerEventUpdated')
              : t('misc.updateRegisterEvent')}
        </button>
      ) : null}
      {updateStatus === 'error' ? <p className="text-xs text-red-700">{t('misc.registerEventUpdateFailed')}</p> : null}
    </div>
  );
}

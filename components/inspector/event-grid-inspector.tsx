'use client';

import { t } from '@/lib/i18n';
import { createEventItem } from '@/lib/newsletter/defaults';
import type { NewsletterSaveIssue } from '@/lib/newsletter/save-validation';
import type { EventGridBlock, EventItem } from '@/lib/newsletter/schema';
import { Area, Field, SelectField } from './fields';
import { useState } from 'react';
import { EventPickerDialog } from './event-picker-dialog';
import { appendEventRecordToGrid } from '@/lib/events/snapshot';

export function EventGridInspector({
  block,
  onChange,
  issues = [],
}: {
  block: EventGridBlock;
  onChange: (patch: Partial<EventGridBlock>) => void;
  issues?: NewsletterSaveIssue[];
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const updateItem = (id: string, patch: Partial<EventItem>) =>
    onChange({ items: block.items.map((item) => (item.id === id ? { ...item, ...patch } : item)) });
  const hasItemIssue = (index: number, field: string) =>
    issues.some((issue) => issue.fieldKey === `items.${index}.${field}`);
  const moveItem = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= block.items.length) return;
    const items = [...block.items];
    [items[index], items[target]] = [items[target], items[index]];
    onChange({ items });
  };

  return (
    <div className="space-y-4">
      <Field label={t('misc.sectionHeading')} value={block.heading} onChange={(heading) => onChange({ heading })} />
      <SelectField
        label={t('misc.layout')}
        value={block.layout ?? 'grid'}
        options={[
          { value: 'grid', label: t('misc.teaserGrid') },
          { value: 'list', label: t('misc.listLayout') },
        ]}
        onChange={(layout) => onChange({ layout })}
      />
      <p className="text-sm text-slate-600">{t('misc.gridLayoutHint')}</p>
      {block.items.map((item, index) => (
        <div key={item.id} className="space-y-2 rounded border p-3">
          <div className="flex items-center justify-between">
            <strong className="text-sm">
              {t('misc.event')} {index + 1}
            </strong>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="rounded border px-2 py-1 text-sm disabled:opacity-30"
                disabled={index === 0}
                aria-label={t('misc.moveEarlier')}
                title={t('misc.moveEarlier')}
                onClick={() => moveItem(index, -1)}
              >
                ↑
              </button>
              <button
                type="button"
                className="rounded border px-2 py-1 text-sm disabled:opacity-30"
                disabled={index === block.items.length - 1}
                aria-label={t('misc.moveLater')}
                title={t('misc.moveLater')}
                onClick={() => moveItem(index, 1)}
              >
                ↓
              </button>
              {block.items.length !== 1 ? (
                <button
                  type="button"
                  className="text-sm text-red-700"
                  onClick={() => onChange({ items: block.items.filter((entry) => entry.id !== item.id) })}
                >
                  {t('misc.remove')}
                </button>
              ) : null}
            </div>
          </div>
          <Field
            label={t('misc.category')}
            value={item.category}
            onChange={(category) => updateItem(item.id, { category })}
          />
          <Field
            label={t('misc.talkTitle')}
            value={item.title}
            required
            invalid={hasItemIssue(index, 'title')}
            onChange={(title) => updateItem(item.id, { title })}
          />
          <Field
            label={t('misc.speakerName')}
            value={item.speakerName}
            onChange={(speakerName) => updateItem(item.id, { speakerName })}
          />
          <Field
            label={t('misc.speakerRole')}
            value={item.speakerRole}
            onChange={(speakerRole) => updateItem(item.id, { speakerRole })}
          />
          <Field label={t('misc.dateTime')} value={item.date} onChange={(date) => updateItem(item.id, { date })} />
          <Field
            label={t('misc.place')}
            value={item.location}
            onChange={(location) => updateItem(item.id, { location })}
          />
          <Area
            label={t('misc.description')}
            value={item.description}
            onChange={(description) => updateItem(item.id, { description })}
          />
          <Field
            label={t('misc.buttonLabel')}
            value={item.buttonLabel}
            required={Boolean(item.buttonUrl)}
            invalid={hasItemIssue(index, 'buttonLabel')}
            onChange={(buttonLabel) => updateItem(item.id, { buttonLabel })}
          />
          <Field
            label={t('misc.buttonUrl')}
            value={item.buttonUrl}
            onChange={(buttonUrl) => updateItem(item.id, { buttonUrl })}
          />
        </div>
      ))}
      <button
        className="rounded bg-blue-700 px-3 py-2 text-sm text-white"
        onClick={() => onChange({ items: [...block.items, createEventItem()] })}
      >
        {t('misc.addEvent')}
      </button>
      <button
        type="button"
        className="ml-2 rounded border border-blue-600 px-3 py-2 text-sm text-blue-700"
        onClick={() => setPickerOpen(true)}
      >
        {t('misc.chooseFromRegister')}
      </button>
      <p className="text-xs text-slate-500">{t('misc.eventSnapshotHint')}</p>
      <EventPickerDialog
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={(event) => onChange({ items: appendEventRecordToGrid(event, block) })}
      />
    </div>
  );
}

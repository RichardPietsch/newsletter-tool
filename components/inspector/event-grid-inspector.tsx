'use client';

import { t } from '@/lib/i18n';
import { createEventItem } from '@/lib/newsletter/defaults';
import type { NewsletterSaveIssue } from '@/lib/newsletter/save-validation';
import type { EventGridBlock, EventItem } from '@/lib/newsletter/schema';
import { Area, Field, SelectField } from './fields';

export function EventGridInspector({
  block,
  onChange,
  issues = [],
}: {
  block: EventGridBlock;
  onChange: (patch: Partial<EventGridBlock>) => void;
  issues?: NewsletterSaveIssue[];
}) {
  const updateItem = (id: string, patch: Partial<EventItem>) =>
    onChange({ items: block.items.map((item) => (item.id === id ? { ...item, ...patch } : item)) });
  const hasItemIssue = (index: number, field: string) =>
    issues.some((issue) => issue.fieldKey === `items.${index}.${field}`);

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
            {block.items.length > 1 && (
              <button
                className="text-sm text-red-700"
                onClick={() => onChange({ items: block.items.filter((entry) => entry.id !== item.id) })}
              >
                {t('misc.remove')}
              </button>
            )}
          </div>
          <Field
            label={t('misc.category')}
            value={item.category}
            onChange={(category) => updateItem(item.id, { category })}
          />
          <Field
            label={t('editor.titleLabel')}
            value={item.title}
            required
            invalid={hasItemIssue(index, 'title')}
            onChange={(title) => updateItem(item.id, { title })}
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
    </div>
  );
}

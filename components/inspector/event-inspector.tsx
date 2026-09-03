'use client';

import { t } from '@/lib/i18n';
import type { NewsletterSaveIssue } from '@/lib/newsletter/save-validation';
import type { EventBlock } from '@/lib/newsletter/schema';
import { Area, Field } from './fields';
import { useState } from 'react';
import { EventPickerDialog } from './event-picker-dialog';
import { eventRecordToBlock } from '@/lib/events/snapshot';

export function EventInspector({
  block,
  onChange,
  issues = [],
}: {
  block: EventBlock;
  onChange: (patch: Partial<EventBlock>) => void;
  issues?: NewsletterSaveIssue[];
}) {
  const hasIssue = (field: string) => issues.some((issue) => issue.fieldKey === field);
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <div className="space-y-3">
      <button
        type="button"
        className="w-full rounded border border-blue-600 px-3 py-2 text-sm text-blue-700"
        onClick={() => setPickerOpen(true)}
      >
        {t('misc.chooseFromRegister')}
      </button>
      <p className="text-xs text-slate-500">{t('misc.eventSnapshotHint')}</p>
      <Field label={t('misc.category')} value={block.category} onChange={(category) => onChange({ category })} />
      <Field
        label={t('misc.talkTitle')}
        value={block.title}
        required
        invalid={hasIssue('title')}
        onChange={(title) => onChange({ title })}
      />
      <Field
        label={t('misc.speakerName')}
        value={block.speakerName}
        onChange={(speakerName) => onChange({ speakerName })}
      />
      <Field
        label={t('misc.speakerRole')}
        value={block.speakerRole}
        onChange={(speakerRole) => onChange({ speakerRole })}
      />
      <Field label={t('misc.date')} value={block.date} onChange={(date) => onChange({ date })} />
      <Field label={t('misc.place')} value={block.location} onChange={(location) => onChange({ location })} />
      <Area
        label={t('misc.shortDescription')}
        value={block.description}
        onChange={(description) => onChange({ description })}
      />
      <Field label={t('misc.buttonUrl')} value={block.buttonUrl} onChange={(buttonUrl) => onChange({ buttonUrl })} />
      <Field
        label={t('misc.buttonLabel')}
        value={block.buttonLabel}
        required={Boolean(block.buttonUrl)}
        invalid={hasIssue('buttonLabel')}
        onChange={(buttonLabel) => onChange({ buttonLabel })}
      />
      <EventPickerDialog
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={(event) => onChange(eventRecordToBlock(event, block))}
      />
    </div>
  );
}

'use client';

import { t } from '@/lib/i18n';
import type { NewsletterSaveIssue } from '@/lib/newsletter/save-validation';
import type { EventBlock } from '@/lib/newsletter/schema';
import { Area, Field } from './fields';

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

  return (
    <div className="space-y-3">
      <Field
        label={t('editor.titleLabel')}
        value={block.title}
        required
        invalid={hasIssue('title')}
        onChange={(title) => onChange({ title })}
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
    </div>
  );
}

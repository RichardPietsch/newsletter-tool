'use client';

import { t } from '@/lib/i18n';
import type { NewsletterSaveIssue } from '@/lib/newsletter/save-validation';
import type { QuoteBlock } from '@/lib/newsletter/schema';
import { Area, Field } from './fields';

export function QuoteInspector({
  block,
  onChange,
  issues = [],
}: {
  block: QuoteBlock;
  onChange: (patch: Partial<QuoteBlock>) => void;
  issues?: NewsletterSaveIssue[];
}) {
  const hasIssue = (field: string) => issues.some((issue) => issue.fieldKey === field);

  return (
    <div className="space-y-3">
      <Area
        label={t('misc.quote')}
        value={block.quote}
        required
        invalid={hasIssue('quote')}
        onChange={(quote) => onChange({ quote })}
      />
      <Field label={t('misc.author')} value={block.author} onChange={(author) => onChange({ author })} />
      <Field label={t('misc.role')} value={block.role} onChange={(role) => onChange({ role })} />
    </div>
  );
}

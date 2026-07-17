'use client';

import { t } from '@/lib/i18n';
import type { NewsletterSaveIssue } from '@/lib/newsletter/save-validation';
import type { SectionHeadingBlock } from '@/lib/newsletter/schema';
import { Field } from './fields';

export function SectionHeadingInspector({
  block,
  onChange,
  issues = [],
}: {
  block: SectionHeadingBlock;
  onChange: (patch: Partial<SectionHeadingBlock>) => void;
  issues?: NewsletterSaveIssue[];
}) {
  const hasIssue = (field: string) => issues.some((issue) => issue.fieldKey === field);

  return (
    <Field
      label={t('misc.section')}
      value={block.label}
      required
      invalid={hasIssue('label')}
      onChange={(label) => onChange({ label })}
    />
  );
}

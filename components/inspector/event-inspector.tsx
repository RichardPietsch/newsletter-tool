'use client';

import { t } from '@/lib/i18n';
import type { NewsletterSaveIssue } from '@/lib/newsletter/save-validation';
import type { EventBlock } from '@/lib/newsletter/schema';
import { Area, Field } from './fields';
import { eventBlockToInput, eventRecordToBlock } from '@/lib/events/snapshot';
import { EventSourceControl } from './event-source-control';
import { useEventRegister } from './use-event-register';

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
  const eventRegister = useEventRegister();

  return (
    <div className="space-y-3">
      <EventSourceControl
        sourceEventId={block.sourceEventId}
        updateKey={JSON.stringify(eventBlockToInput(block))}
        events={eventRegister.events}
        loading={eventRegister.loading}
        loadFailed={eventRegister.loadFailed}
        onSelect={(event) => onChange(eventRecordToBlock(event, block))}
        onCustom={() => onChange({ sourceEventId: undefined })}
        onUpdate={() =>
          block.sourceEventId
            ? eventRegister.updateEvent(block.sourceEventId, eventBlockToInput(block))
            : Promise.resolve(false)
        }
      />
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
    </div>
  );
}

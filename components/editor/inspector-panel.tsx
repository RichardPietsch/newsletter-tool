'use client';

import { t } from '@/lib/i18n';
import { useNewsletterStore } from '@/lib/newsletter/store';
import type { NewsletterSaveIssue } from '@/lib/newsletter/save-validation';
import type { NewsletterBlock, NewsletterBlockPatch } from '@/lib/newsletter/schema';
import type { GlobalSettings } from '@/lib/settings/schema';
import { EventGridInspector } from '../inspector/event-grid-inspector';
import { EventInspector } from '../inspector/event-inspector';
import { FeaturedEventInspector } from '../inspector/featured-event-inspector';
import { HeaderInspector } from '../inspector/header-inspector';
import { ImageInspector } from '../inspector/image-inspector';
import { LockedBlockInspector } from '../inspector/locked-block-inspector';
import { QuoteInspector } from '../inspector/quote-inspector';
import { SectionHeadingInspector } from '../inspector/section-heading-inspector';
import { TextInspector } from '../inspector/text-inspector';

type InspectorContentProps = {
  block: NewsletterBlock;
  settings?: GlobalSettings;
  issues: NewsletterSaveIssue[];
  onChange: (patch: NewsletterBlockPatch) => void;
};

function InspectorContent({ block, settings, issues, onChange }: InspectorContentProps) {
  switch (block.type) {
    case 'header':
      return <HeaderInspector block={block} settings={settings} onChange={onChange} />;
    case 'footer':
      return <LockedBlockInspector />;
    case 'text':
      return <TextInspector />;
    case 'featuredEvent':
      return <FeaturedEventInspector block={block} validationIssues={issues} onChange={onChange} />;
    case 'quote':
      return <QuoteInspector block={block} issues={issues} onChange={onChange} />;
    case 'sectionHeading':
      return <SectionHeadingInspector block={block} issues={issues} onChange={onChange} />;
    case 'eventGrid':
      return <EventGridInspector block={block} issues={issues} onChange={onChange} />;
    case 'event':
      return <EventInspector block={block} issues={issues} onChange={onChange} />;
    case 'image':
      return <ImageInspector block={block} validationIssues={issues} onChange={onChange} />;
  }
}

function InspectorToolbar({
  block,
  onMove,
  onDelete,
}: {
  block: NewsletterBlock;
  onMove: (direction: -1 | 1) => void;
  onDelete: () => void;
}) {
  return (
    <div className="mb-4 flex gap-2">
      <button onClick={() => onMove(-1)} className="rounded border px-2">
        {t('editor.moveUp')}
      </button>
      <button onClick={() => onMove(1)} className="rounded border px-2">
        {t('editor.moveDown')}
      </button>
      {block.type !== 'header' && block.type !== 'footer' && (
        <button onClick={onDelete} className="rounded border px-2 text-red-700">
          {t('editor.delete')}
        </button>
      )}
    </div>
  );
}

export function InspectorPanel({
  settings,
  readOnly = false,
  validationIssues = [],
}: {
  settings?: GlobalSettings;
  readOnly?: boolean;
  validationIssues?: NewsletterSaveIssue[];
}) {
  const doc = useNewsletterStore((store) => store.doc);
  const id = useNewsletterStore((store) => store.selectedId);
  const update = useNewsletterStore((store) => store.update);
  const del = useNewsletterStore((store) => store.delete);
  const move = useNewsletterStore((store) => store.move);

  if (!doc) return null;

  const block = doc.blocks.find((item) => item.id === id);
  const blockIssues = block ? validationIssues.filter((issue) => issue.blockId === block.id) : [];

  if (readOnly) {
    return (
      <aside data-tour="inspector" className="sticky top-0 h-screen w-96 overflow-y-auto border-l bg-white p-6">
        <h2 className="text-lg font-semibold">{t('editor.readonlyTitle')}</h2>
        <p className="mt-2 text-sm text-slate-600">{t('editor.readonlyDescription')}</p>
      </aside>
    );
  }

  if (!block) {
    return (
      <aside data-tour="inspector" className="sticky top-0 h-screen w-96 overflow-y-auto border-l bg-white p-6">
        {t('editor.selectModule')}
      </aside>
    );
  }

  return (
    <aside data-tour="inspector" className="sticky top-0 h-screen w-96 overflow-y-auto border-l bg-white p-6">
      <InspectorToolbar
        block={block}
        onMove={(direction) => move(block.id, direction)}
        onDelete={() => del(block.id)}
      />
      <InspectorContent
        block={block}
        settings={settings}
        issues={blockIssues}
        onChange={(patch) => update(block.id, patch)}
      />
    </aside>
  );
}

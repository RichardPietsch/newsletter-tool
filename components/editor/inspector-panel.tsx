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
import { BackgroundSectionInspector } from '../inspector/background-section-inspector';
import { backgroundParentId, findNewsletterBlock } from '@/lib/newsletter/operations';

type InspectorContentProps = {
  block: NewsletterBlock;
  settings?: GlobalSettings;
  issues: NewsletterSaveIssue[];
  onChange: (patch: NewsletterBlockPatch) => void;
  onOpenGlobalSettings: (section: 'header' | 'footer') => void;
};

function InspectorContent({ block, settings, issues, onChange, onOpenGlobalSettings }: InspectorContentProps) {
  switch (block.type) {
    case 'header':
      return (
        <HeaderInspector
          block={block}
          settings={settings}
          onChange={onChange}
          onOpenGlobalSettings={() => onOpenGlobalSettings('header')}
        />
      );
    case 'footer':
      return <LockedBlockInspector onOpenGlobalSettings={() => onOpenGlobalSettings('footer')} />;
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
    case 'backgroundSection':
      return <BackgroundSectionInspector block={block} onChange={onChange} />;
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
  onRemoveFromBackground,
  canDelete = true,
}: {
  block: NewsletterBlock;
  onMove: (direction: -1 | 1) => void;
  onDelete: () => void;
  onRemoveFromBackground?: () => void;
  canDelete?: boolean;
}) {
  return (
    <div className="mb-4 flex flex-wrap gap-2">
      <button onClick={() => onMove(-1)} className="rounded border px-2">
        {t('editor.moveUp')}
      </button>
      <button onClick={() => onMove(1)} className="rounded border px-2">
        {t('editor.moveDown')}
      </button>
      {canDelete && block.type !== 'header' && block.type !== 'footer' && (
        <button onClick={onDelete} className="rounded border px-2 text-red-700">
          {t('editor.delete')}
        </button>
      )}
      {onRemoveFromBackground ? (
        <button onClick={onRemoveFromBackground} className="rounded border px-2 text-blue-700">
          {t('misc.removeFromBackground')}
        </button>
      ) : null}
    </div>
  );
}

export function InspectorPanel({
  settings,
  readOnly = false,
  validationIssues = [],
  onOpenGlobalSettings,
}: {
  settings?: GlobalSettings;
  readOnly?: boolean;
  validationIssues?: NewsletterSaveIssue[];
  onOpenGlobalSettings: (section: 'header' | 'footer') => void;
}) {
  const doc = useNewsletterStore((store) => store.doc);
  const id = useNewsletterStore((store) => store.selectedId);
  const update = useNewsletterStore((store) => store.update);
  const del = useNewsletterStore((store) => store.delete);
  const move = useNewsletterStore((store) => store.move);
  const removeFromBackground = useNewsletterStore((store) => store.removeFromBackground);
  const moveIntoBackground = useNewsletterStore((store) => store.moveIntoBackground);

  if (!doc) return null;

  const block = findNewsletterBlock(doc, id);
  const parentId = backgroundParentId(doc, id);
  const backgroundParent = doc.blocks.find((entry) => entry.id === parentId);
  const canDelete =
    !parentId || (backgroundParent?.type === 'backgroundSection' && backgroundParent.blocks.length !== 1);
  const backgroundTargets = doc.blocks.filter((entry) => entry.type === 'backgroundSection');
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
        onRemoveFromBackground={parentId ? () => removeFromBackground(block.id) : undefined}
        canDelete={canDelete}
      />
      <InspectorContent
        block={block}
        settings={settings}
        issues={blockIssues}
        onChange={(patch) => update(block.id, patch)}
        onOpenGlobalSettings={onOpenGlobalSettings}
      />
      {!parentId &&
      block.type !== 'header' &&
      block.type !== 'footer' &&
      block.type !== 'backgroundSection' &&
      backgroundTargets.length !== 0 ? (
        <div className="mt-6 space-y-2 border-t pt-4">
          <p className="text-sm font-medium">{t('misc.moveIntoBackground')}</p>
          {backgroundTargets.map((target, index) => (
            <button
              key={target.id}
              type="button"
              className="w-full rounded border px-3 py-2 text-sm text-blue-700"
              onClick={() => moveIntoBackground(block.id, target.id)}
            >
              {t('misc.backgroundSection')} {index + 1}
            </button>
          ))}
        </div>
      ) : null}
    </aside>
  );
}

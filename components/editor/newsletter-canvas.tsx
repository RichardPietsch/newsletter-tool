'use client';

import { useState } from 'react';
import type { NewsletterContentBlock } from '@/lib/newsletter/schema';
import type { NewsletterSaveIssue } from '@/lib/newsletter/save-validation';
import type { GlobalSettings } from '@/lib/settings/schema';
import { useNewsletterStore } from '@/lib/newsletter/store';
import { InsertionPoint } from './insertion-point';
import { ModulePickerDialog } from './module-picker-dialog';
import { HeaderBlock } from '../blocks/header-block';
import { FooterBlock } from '../blocks/footer-block';
import { TextBlock } from '../blocks/text-block';
import { EventBlock } from '../blocks/event-block';
import { ImageBlock } from '../blocks/image-block';
import { FeaturedEventBlock } from '../blocks/featured-event-block';
import { QuoteBlock } from '../blocks/quote-block';
import { SectionHeadingBlock } from '../blocks/section-heading-block';
import { EventGridBlock } from '../blocks/event-grid-block';
import {
  newsletterModuleStyles as styles,
  createNewsletterPreviewCssVariables,
  deriveNewsletterColorPalette,
  newsletterColorPalettes,
  type NewsletterPreviewMode,
} from '@/lib/newsletter/module-styles';
import { t } from '@/lib/i18n';

type InsertionTarget = { index: number; backgroundId?: string };

function ContentBlock({
  block,
  readOnly,
  squareTop = false,
}: {
  block: NewsletterContentBlock;
  readOnly: boolean;
  squareTop?: boolean;
}) {
  if (block.type === 'text') return <TextBlock block={block} readOnly={readOnly} squareTop={squareTop} />;
  if (block.type === 'event') return <EventBlock block={block} />;
  if (block.type === 'featuredEvent') return <FeaturedEventBlock block={block} />;
  if (block.type === 'quote') return <QuoteBlock block={block} />;
  if (block.type === 'sectionHeading') return <SectionHeadingBlock block={block} />;
  if (block.type === 'eventGrid') return <EventGridBlock block={block} />;
  return <ImageBlock block={block} />;
}

export function NewsletterCanvas({
  settings,
  readOnly = false,
  validationIssues = [],
  previewMode,
}: {
  settings?: GlobalSettings;
  readOnly?: boolean;
  validationIssues?: NewsletterSaveIssue[];
  previewMode: NewsletterPreviewMode;
}) {
  const doc = useNewsletterStore((state) => state.doc);
  const selectedId = useNewsletterStore((state) => state.selectedId);
  const select = useNewsletterStore((state) => state.select);
  const insert = useNewsletterStore((state) => state.insert);
  const insertIntoBackground = useNewsletterStore((state) => state.insertIntoBackground);
  const [insertionTarget, setInsertionTarget] = useState<InsertionTarget | null>(null);

  if (!doc) return null;
  const previewColors = settings
    ? deriveNewsletterColorPalette(settings.colors[previewMode])
    : newsletterColorPalettes[previewMode];

  const selectionClass = (id: string) => {
    const invalid = validationIssues.some((issue) => issue.blockId === id);
    return `rounded ${invalid ? 'ring-4 ring-red-500' : selectedId === id ? 'ring-4 ring-blue-600' : 'ring-1 ring-slate-200'} hover:ring-blue-400`;
  };

  return (
    <div
      className="newsletter-export-preview mx-auto w-[600px] py-8 transition-colors"
      data-tour="editor-canvas"
      data-newsletter-theme={previewMode}
      style={{
        ...createNewsletterPreviewCssVariables(previewColors),
        backgroundColor: styles.colorVariables.background,
        color: styles.colorVariables.text,
      }}
    >
      {doc.blocks.map((block, index) => {
        const previousBlock = doc.blocks[index - 1];
        const nextBlock = doc.blocks[index + 1];
        const isHeaderTextConnection = previousBlock?.type === 'header' && block.type === 'text';
        const moduleSpacing = index === 0 || isHeaderTextConnection ? '' : 'mt-6';

        if (block.type === 'backgroundSection') {
          const backgroundColor =
            block.background === 'blue' ? styles.colorVariables.featureBackground : styles.colorVariables.surface;
          const labelColor =
            block.background === 'blue' ? styles.colorVariables.featureMuted : styles.colorVariables.muted;
          return (
            <div key={block.id} className={moduleSpacing}>
              <section
                role="button"
                tabIndex={0}
                className={`relative left-1/2 w-[696px] -translate-x-1/2 rounded p-12 ${selectionClass(block.id)}`}
                style={{ backgroundColor }}
                onClick={() => select(block.id)}
                onKeyDown={(event) => event.key === 'Enter' && select(block.id)}
              >
                <div
                  className="newsletter-editor-ui mb-4 text-center text-[10px] font-bold uppercase tracking-[0.2em]"
                  style={{ color: labelColor }}
                >
                  {t('misc.backgroundSection')}
                </div>
                <div className="mx-auto w-[600px]">
                  {block.blocks.map((child, childIndex) => (
                    <div key={child.id} className={childIndex === 0 ? '' : 'mt-6'}>
                      <div
                        role="button"
                        tabIndex={0}
                        className={selectionClass(child.id)}
                        onClick={(event) => {
                          event.stopPropagation();
                          select(child.id);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.stopPropagation();
                            select(child.id);
                          }
                        }}
                      >
                        <ContentBlock block={child} readOnly={readOnly} />
                      </div>
                      {!readOnly ? (
                        <div onClick={(event) => event.stopPropagation()}>
                          <InsertionPoint
                            index={childIndex + 1}
                            onOpen={(childInsertionIndex) =>
                              setInsertionTarget({ index: childInsertionIndex, backgroundId: block.id })
                            }
                          />
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </section>
              {!readOnly ? (
                <InsertionPoint
                  index={index + 1}
                  onOpen={(insertIndex) => setInsertionTarget({ index: insertIndex })}
                />
              ) : null}
            </div>
          );
        }

        return (
          <div key={block.id} className={moduleSpacing}>
            <div
              role="button"
              tabIndex={0}
              data-tour="newsletter-module"
              onClick={() => select(block.id)}
              onKeyDown={(event) => event.key === 'Enter' && select(block.id)}
              className={selectionClass(block.id)}
            >
              {block.type === 'header' ? (
                <HeaderBlock
                  branding={block.branding}
                  settings={settings}
                  headerVariantId={block.headerVariantId}
                  squareBottom={nextBlock?.type === 'text'}
                />
              ) : block.type === 'footer' ? (
                <FooterBlock contact={block.contact} legal={block.legal} settings={settings} />
              ) : (
                <ContentBlock block={block} readOnly={readOnly} squareTop={previousBlock?.type === 'header'} />
              )}
            </div>
            {!readOnly && index < doc.blocks.length - 1 ? (
              <InsertionPoint index={index + 1} onOpen={(insertIndex) => setInsertionTarget({ index: insertIndex })} />
            ) : null}
          </div>
        );
      })}
      <ModulePickerDialog
        open={!readOnly && insertionTarget !== null}
        allowBackground={!insertionTarget?.backgroundId}
        onOpenChange={(value) => !value && setInsertionTarget(null)}
        onPick={(type) => {
          if (!insertionTarget) return;
          if (insertionTarget.backgroundId) {
            if (type !== 'backgroundSection')
              insertIntoBackground(insertionTarget.backgroundId, insertionTarget.index, type);
          } else insert(insertionTarget.index, type);
          setInsertionTarget(null);
        }}
      />
    </div>
  );
}

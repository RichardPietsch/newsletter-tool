'use client';

import { useState } from 'react';
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

export function NewsletterCanvas({
  settings,
  readOnly = false,
  validationIssues = [],
}: {
  settings?: GlobalSettings;
  readOnly?: boolean;
  validationIssues?: NewsletterSaveIssue[];
}) {
  const doc = useNewsletterStore((state) => state.doc);
  const selectedId = useNewsletterStore((state) => state.selectedId);
  const select = useNewsletterStore((state) => state.select);
  const insert = useNewsletterStore((state) => state.insert);
  const [insertionIndex, setInsertionIndex] = useState<number | null>(null);

  return (
    <div className="mx-auto w-[600px] py-8" data-tour="editor-canvas">
      {doc.blocks.map((block, index) => {
        const previousBlock = doc.blocks[index - 1];
        const nextBlock = doc.blocks[index + 1];
        const isHeaderTextConnection = previousBlock?.type === 'header' && block.type === 'text';
        const moduleSpacing = index === 0 || isHeaderTextConnection ? '' : 'mt-6';
        const hasValidationIssue = validationIssues.some((issue) => issue.blockId === block.id);
        return (
          <div key={block.id} className={moduleSpacing}>
            <div
              role="button"
              tabIndex={0}
              data-tour="newsletter-module"
              onClick={() => select(block.id)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') select(block.id);
              }}
              className={`rounded ${hasValidationIssue ? 'ring-4 ring-red-500' : selectedId === block.id ? 'ring-4 ring-blue-600' : 'ring-1 ring-slate-200'} hover:ring-blue-400`}
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
              ) : block.type === 'text' ? (
                <TextBlock block={block} readOnly={readOnly} squareTop={previousBlock?.type === 'header'} />
              ) : block.type === 'event' ? (
                <EventBlock block={block} />
              ) : block.type === 'featuredEvent' ? (
                <FeaturedEventBlock block={block} />
              ) : block.type === 'quote' ? (
                <QuoteBlock block={block} />
              ) : block.type === 'sectionHeading' ? (
                <SectionHeadingBlock block={block} />
              ) : block.type === 'eventGrid' ? (
                <EventGridBlock block={block} />
              ) : (
                <ImageBlock block={block} />
              )}
            </div>
            {!readOnly && index < doc.blocks.length - 1 ? (
              <InsertionPoint index={index + 1} onOpen={setInsertionIndex} />
            ) : null}
          </div>
        );
      })}
      <ModulePickerDialog
        open={!readOnly && insertionIndex !== null}
        onOpenChange={(value) => !value && setInsertionIndex(null)}
        onPick={(type) => {
          if (insertionIndex !== null) insert(insertionIndex, type);
          setInsertionIndex(null);
        }}
      />
    </div>
  );
}

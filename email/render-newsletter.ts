import mjml2html from 'mjml';
import type { GlobalSettings } from '@/lib/settings/schema';
import { newsletterDocumentSchema, type NewsletterDocument } from '@/lib/newsletter/schema';
import { renderEvent } from './modules/event';
import { renderEventGrid } from './modules/event-grid';
import { renderFeaturedEvent } from './modules/featured-event';
import { renderFooter } from './modules/footer';
import { renderHeader } from './modules/header';
import { renderImage } from './modules/image';
import { renderQuote } from './modules/quote';
import { renderSectionHeading } from './modules/section-heading';
import { renderText } from './modules/text';
import { emailTheme } from './theme';

const MODULE_GAP =
  '<mj-section background-color="#f4f1ec" padding="0"><mj-column><mj-spacer height="32px" /></mj-column></mj-section>';

type MjmlRenderResult = {
  html: string;
  errors: unknown[];
};

type MjmlRender = (mjml: string, options?: { validationLevel?: 'strict' | 'soft' | 'skip' }) => MjmlRenderResult;

const renderMjml = mjml2html as unknown as MjmlRender;

export function renderNewsletter(input: NewsletterDocument, settings?: GlobalSettings) {
  const doc = newsletterDocumentSchema.parse(input);
  const body = doc.blocks
    .map((b, index) => {
      const previousBlock = doc.blocks[index - 1];
      const needsGap = index > 0 && !(previousBlock?.type === 'header' && b.type === 'text');
      const rendered =
        b.type === 'header'
          ? renderHeader(b.branding, b.headerVariantId, settings, {
              squareBottom: doc.blocks[index + 1]?.type === 'text',
            })
          : b.type === 'footer'
            ? renderFooter(b.contact, b.legal, settings)
            : b.type === 'text'
              ? renderText(b, { squareTop: previousBlock?.type === 'header' })
              : b.type === 'event'
                ? renderEvent(b)
                : b.type === 'featuredEvent'
                  ? renderFeaturedEvent(b)
                  : b.type === 'quote'
                    ? renderQuote(b)
                    : b.type === 'sectionHeading'
                      ? renderSectionHeading(b)
                      : b.type === 'eventGrid'
                        ? renderEventGrid(b)
                        : renderImage(b);
      return `${needsGap ? `${MODULE_GAP}\n` : ''}${rendered}`;
    })
    .join('\n');
  const mjml = `<mjml><mj-head><mj-title>${doc.title}</mj-title><mj-preview>${doc.title}</mj-preview><mj-attributes><mj-all font-family="${emailTheme.font}" /><mj-body background-color="${emailTheme.colors.bg}" width="${emailTheme.container}px" /></mj-attributes></mj-head><mj-body>${body}</mj-body></mjml>`;
  const { html, errors } = renderMjml(mjml, { validationLevel: 'soft' });
  if (errors.length) console.warn(errors);
  return '<!doctype html>\n' + html.replace('<html ', '<html lang="de" ');
}

export const safeFilename = (title: string) =>
  `${
    title
      .toLowerCase()
      .replace(/[^a-z0-9äöüß]+/gi, '-')
      .replace(/^-|-$/g, '') || 'newsletter'
  }.html`;

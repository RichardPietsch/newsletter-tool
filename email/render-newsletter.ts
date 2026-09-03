import mjml2html from 'mjml';
import type { GlobalSettings } from '@/lib/settings/schema';
import {
  newsletterDocumentSchema,
  type NewsletterContentBlock,
  type NewsletterDocument,
} from '@/lib/newsletter/schema';
import { renderEvent } from './modules/event';
import { renderEventGrid } from './modules/event-grid';
import { renderFeaturedEvent } from './modules/featured-event';
import { renderFooter } from './modules/footer';
import { renderHeader } from './modules/header';
import { renderImage } from './modules/image';
import { renderRegisteredEmailModule } from '@/email/module-render-registry';
import { isRegisteredNewsletterBlock } from '@/lib/newsletter/module-registry';
import { renderText } from './modules/text';
import { emailTheme } from './theme';
import {
  createNewsletterEmailDarkModeCss,
  deriveNewsletterColorPalette,
  newsletterColorPalettes,
  newsletterEmailClasses as classes,
  type NewsletterColorPalette,
} from '@/lib/newsletter/module-styles';
import { logger } from '@/lib/logging/logger';

const moduleGap = (colors: NewsletterColorPalette) =>
  `<mj-section css-class="${classes.background}" background-color="${colors.background}" padding="0"><mj-column><mj-spacer height="32px" /></mj-column></mj-section>`;

type MjmlRenderResult = {
  html: string;
  errors: unknown[];
};

type MjmlRender = (mjml: string, options?: { validationLevel?: 'strict' | 'soft' | 'skip' }) => MjmlRenderResult;

const renderMjml = mjml2html as unknown as MjmlRender;

function renderContentBlock(block: NewsletterContentBlock, colors: NewsletterColorPalette) {
  if (block.type === 'text') return renderText(block, {}, colors);
  if (block.type === 'event') return renderEvent(block, colors);
  if (block.type === 'featuredEvent') return renderFeaturedEvent(block, colors);
  if (isRegisteredNewsletterBlock(block)) return renderRegisteredEmailModule(block, colors);
  if (block.type === 'eventGrid') return renderEventGrid(block, colors);
  return renderImage(block, colors);
}

function renderBackgroundSection(
  block: Extract<NewsletterDocument['blocks'][number], { type: 'backgroundSection' }>,
  colors: NewsletterColorPalette,
) {
  const isBlue = block.background === 'blue';
  const backgroundClass = isBlue ? classes.featureBackground : classes.surface;
  const backgroundColor = isBlue ? colors.featureBackground : colors.surface;
  const backgroundGap = `<mj-section css-class="${backgroundClass}" background-color="${backgroundColor}" padding="0"><mj-column><mj-spacer height="32px" /></mj-column></mj-section>`;
  const content = block.blocks
    .map((child, index) => `${index > 0 ? `${backgroundGap}\n` : ''}${renderContentBlock(child, colors)}`)
    .join('\n');
  return `<mj-wrapper full-width="full-width" css-class="${backgroundClass}" background-color="${backgroundColor}" padding="32px 0">${content}</mj-wrapper>`;
}

export function renderNewsletter(input: NewsletterDocument, settings?: GlobalSettings) {
  const doc = newsletterDocumentSchema.parse(input);
  const lightColors = settings ? deriveNewsletterColorPalette(settings.colors.light) : newsletterColorPalettes.light;
  const darkColors = settings ? deriveNewsletterColorPalette(settings.colors.dark) : newsletterColorPalettes.dark;
  const body = doc.blocks
    .map((b, index) => {
      const previousBlock = doc.blocks[index - 1];
      const needsGap = index > 0 && !(previousBlock?.type === 'header' && b.type === 'text');
      const rendered =
        b.type === 'backgroundSection'
          ? renderBackgroundSection(b, lightColors)
          : b.type === 'header'
            ? renderHeader(b.branding, b.headerVariantId, settings, {
                squareBottom: doc.blocks[index + 1]?.type === 'text',
              })
            : b.type === 'footer'
              ? renderFooter(b.contact, b.legal, settings)
              : b.type === 'text'
                ? renderText(b, { squareTop: previousBlock?.type === 'header' }, lightColors)
                : b.type === 'event'
                  ? renderEvent(b, lightColors)
                  : b.type === 'featuredEvent'
                    ? renderFeaturedEvent(b, lightColors)
                    : isRegisteredNewsletterBlock(b)
                      ? renderRegisteredEmailModule(b, lightColors)
                      : b.type === 'eventGrid'
                        ? renderEventGrid(b, lightColors)
                        : renderImage(b, lightColors);
      return `${needsGap ? `${moduleGap(lightColors)}\n` : ''}${rendered}`;
    })
    .join('\n');
  const mjml = `<mjml><mj-head><mj-title>${doc.title}</mj-title><mj-preview>${doc.title}</mj-preview><mj-raw><meta name="color-scheme" content="light dark"><meta name="supported-color-schemes" content="light dark"></mj-raw><mj-style>${createNewsletterEmailDarkModeCss(darkColors)}</mj-style><mj-attributes><mj-all font-family="${emailTheme.font}" /></mj-attributes></mj-head><mj-body background-color="${lightColors.background}" width="${emailTheme.container}px">${body}</mj-body></mjml>`;
  const { html, errors } = renderMjml(mjml, { validationLevel: 'soft' });
  if (errors.length) logger.warn({ event: 'newsletter.mjml.warnings' }, { warningCount: errors.length });
  return '<!doctype html>\n' + html.replace('<html ', '<html lang="de" ');
}

export const safeFilename = (title: string) =>
  `${
    title
      .toLowerCase()
      .replace(/[^a-z0-9äöüß]+/gi, '-')
      .replace(/^-|-$/g, '') || 'newsletter'
  }.html`;

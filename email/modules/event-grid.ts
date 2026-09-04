import type { EventGridBlock, EventItem } from '@/lib/newsletter/schema';
import {
  newsletterEmailClasses as classes,
  newsletterModuleStyles as styles,
  type NewsletterColorPalette,
} from '@/lib/newsletter/module-styles';

const px = (value: number) => `${value}px`;

function card(item: EventItem, colors: NewsletterColorPalette) {
  const hasButton = Boolean(item.buttonUrl);
  return `${item.image?.src ? `<mj-image src="${item.image.src}" alt="${item.image.decorative ? '' : item.image.alt || ''}" height="${px(styles.eventGrid.imageHeight)}" padding="0" />` : ''}<mj-text css-class="${classes.accent}" padding="${px(styles.eventGrid.overlineTop)} ${px(styles.eventGrid.cardPadding)} 0" font-size="10px" font-weight="700" letter-spacing="2px" color="${colors.accent}" text-transform="uppercase">${item.category || ''}</mj-text><mj-text css-class="${classes.text}" padding="${px(styles.eventGrid.titleTop)} ${px(styles.eventGrid.cardPadding)} 0" font-size="20px" line-height="1.25" font-family="Georgia, Times, serif" color="${colors.text}">${item.title}</mj-text>${item.speakerName || item.speakerRole ? `<mj-text css-class="${classes.muted}" padding="8px ${px(styles.eventGrid.cardPadding)} 0" font-size="13px" font-weight="600" color="${colors.muted}">${[item.speakerName, item.speakerRole].filter(Boolean).join(' · ')}</mj-text>` : ''}${item.date || item.location ? `<mj-text css-class="${classes.muted}" padding="${px(styles.eventGrid.metaTop)} ${px(styles.eventGrid.cardPadding)} 0" font-size="13px" color="${colors.muted}">${[item.date, item.location].filter(Boolean).join(' · ')}</mj-text>` : ''}${item.description ? `<mj-text css-class="${classes.text}" padding="${px(styles.eventGrid.descriptionTop)} ${px(styles.eventGrid.cardPadding)} 0" font-size="13px" line-height="1.5" color="${colors.text}">${item.description}</mj-text>` : ''}${hasButton ? `<mj-button css-class="${classes.outlineButton}" align="left" padding="${px(styles.eventGrid.ctaTop)} ${px(styles.eventGrid.cardPadding)} ${px(styles.eventGrid.ctaBottom)}" href="${item.buttonUrl}" background-color="${colors.teaser}" border="1px solid ${colors.text}" color="${colors.text}" border-radius="0" font-size="10px" font-weight="700" text-transform="uppercase">${item.buttonLabel}</mj-button>` : `<mj-spacer height="${px(styles.eventGrid.cardPadding)}" />`}`;
}

export function renderEventGrid(block: EventGridBlock, colors: NewsletterColorPalette = styles.colors) {
  let out = block.heading
    ? `<mj-section css-class="${classes.background}" background-color="${colors.background}" padding="${px(styles.eventGrid.outerPaddingY)} ${px(styles.eventGrid.outerPaddingX)} 8px"><mj-column><mj-text css-class="${classes.accent}" padding="0" font-size="11px" font-weight="700" letter-spacing="2.8px" color="${colors.accent}" text-transform="uppercase">${block.heading}</mj-text></mj-column></mj-section>`
    : '';
  if (block.layout === 'list') {
    for (const item of block.items) {
      out += `<mj-section css-class="${classes.background}" background-color="${colors.background}" padding="12px ${px(styles.eventGrid.outerPaddingX)}"><mj-column css-class="${classes.teaser} ${classes.rounded}" background-color="${colors.teaser}" border-radius="4px">${card(item, colors)}</mj-column></mj-section>`;
    }
    return out;
  }
  for (let i = 0; i < block.items.length; i += 2) {
    const remaining = block.items.length - i;
    if (remaining === 1) {
      out += `<mj-section css-class="${classes.background}" background-color="${colors.background}" padding="12px ${px(styles.eventGrid.outerPaddingX)}"><mj-column css-class="${classes.teaser} ${classes.rounded}" background-color="${colors.teaser}" border-radius="4px">${card(block.items[i], colors)}</mj-column></mj-section>`;
    } else {
      out += `<mj-section css-class="${classes.background}" background-color="${colors.background}" padding="12px ${px(styles.eventGrid.outerPaddingX)}"><mj-column css-class="${classes.teaser} ${classes.rounded}" width="50%" background-color="${colors.teaser}" border-radius="4px">${card(block.items[i], colors)}</mj-column><mj-column css-class="${classes.teaser} ${classes.rounded}" width="50%" background-color="${colors.teaser}" border-radius="4px">${card(block.items[i + 1], colors)}</mj-column></mj-section>`;
    }
  }
  return out;
}

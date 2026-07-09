import type { EventGridBlock, EventItem } from '@/lib/newsletter/schema';
import { newsletterModuleStyles as styles } from '@/lib/newsletter/module-styles';

const px = (value: number) => `${value}px`;

function card(item: EventItem) {
  const hasButton = Boolean(item.buttonUrl);
  return `${item.image?.src ? `<mj-image src="${item.image.src}" alt="${item.image.decorative ? '' : item.image.alt || ''}" height="${px(styles.eventGrid.imageHeight)}" padding="0" />` : ''}<mj-text padding="${px(styles.eventGrid.overlineTop)} ${px(styles.eventGrid.cardPadding)} 0" font-size="10px" font-weight="700" letter-spacing="2px" color="${styles.red}" text-transform="uppercase">${item.category || ''}</mj-text><mj-text padding="${px(styles.eventGrid.titleTop)} ${px(styles.eventGrid.cardPadding)} 0" font-size="20px" line-height="1.25" font-family="Georgia, Times, serif" color="${styles.serifText}">${item.title}</mj-text>${item.date || item.location ? `<mj-text padding="${px(styles.eventGrid.metaTop)} ${px(styles.eventGrid.cardPadding)} 0" font-size="13px" color="${styles.mutedText}">${[item.date, item.location].filter(Boolean).join(' · ')}</mj-text>` : ''}${item.description ? `<mj-text padding="${px(styles.eventGrid.descriptionTop)} ${px(styles.eventGrid.cardPadding)} 0" font-size="13px" line-height="1.5" color="${styles.bodyText}">${item.description}</mj-text>` : ''}${hasButton ? `<mj-button align="left" padding="${px(styles.eventGrid.ctaTop)} ${px(styles.eventGrid.cardPadding)} ${px(styles.eventGrid.ctaBottom)}" href="${item.buttonUrl}" background-color="${styles.cardBackground}" border="1px solid ${styles.navy}" color="${styles.navy}" border-radius="0" font-size="10px" font-weight="700" text-transform="uppercase">${item.buttonLabel}</mj-button>` : `<mj-spacer height="${px(styles.eventGrid.cardPadding)}" />`}`;
}

export function renderEventGrid(block: EventGridBlock) {
  let out = block.heading ? `<mj-section background-color="${styles.newsletterBackground}" padding="${px(styles.eventGrid.outerPaddingY)} ${px(styles.eventGrid.outerPaddingX)} 8px"><mj-column><mj-text padding="0" font-size="11px" font-weight="700" letter-spacing="2.8px" color="${styles.red}" text-transform="uppercase">${block.heading}</mj-text></mj-column></mj-section>` : '';
  for (let i = 0; i < block.items.length; i += 2) {
    const remaining = block.items.length - i;
    if (remaining === 1) {
      out += `<mj-section background-color="${styles.newsletterBackground}" padding="8px ${px(styles.eventGrid.outerPaddingX)}"><mj-column background-color="${styles.cardBackground}">${card(block.items[i])}</mj-column></mj-section>`;
    } else {
      out += `<mj-section background-color="${styles.newsletterBackground}" padding="8px ${px(styles.eventGrid.outerPaddingX)}"><mj-column width="50%" background-color="${styles.cardBackground}">${card(block.items[i])}</mj-column><mj-column width="50%" background-color="${styles.cardBackground}">${card(block.items[i + 1])}</mj-column></mj-section>`;
    }
  }
  return out;
}

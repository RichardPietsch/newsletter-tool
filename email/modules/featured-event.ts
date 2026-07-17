import type { FeaturedEventBlock } from '@/lib/newsletter/schema';
import { newsletterModuleStyles as styles } from '@/lib/newsletter/module-styles';

export function renderFeaturedEvent(block: FeaturedEventBlock) {
  const isWhite = block.background === 'white';
  const backgroundColor = isWhite ? styles.cardBackground : styles.navy;
  const titleColor = isWhite ? styles.bodyText : '#ffffff';
  const overlineColor = isWhite ? styles.red : '#cddde3';
  const dateColor = isWhite ? styles.mutedText : '#c7d4da';
  const descriptionColor = isWhite ? styles.bodyText : '#dbe5e9';
  const buttonBackground = isWhite ? styles.navy : '#dbe7eb';
  const buttonColor = isWhite ? '#ffffff' : styles.navy;

  return `<mj-section background-color="${backgroundColor}" padding="0" border-radius="4px"><mj-column border-radius="4px">${block.image?.src ? `<mj-image src="${block.image.src}" alt="${block.image.decorative ? '' : block.image.alt || ''}" padding="0" />` : ''}<mj-text padding="28px 32px 0" font-size="11px" font-weight="700" letter-spacing="2px" color="${overlineColor}" text-transform="uppercase">${block.overline}</mj-text><mj-text padding="8px 32px 0" font-size="30px" line-height="1.2" color="${titleColor}" font-family="Georgia, Times, serif">${block.title}</mj-text>${block.date ? `<mj-text padding="20px 32px 0" font-size="13px" color="${dateColor}">${block.date}</mj-text>` : ''}${block.description ? `<mj-text padding="10px 32px 0" font-size="14px" line-height="1.6" color="${descriptionColor}">${block.description}</mj-text>` : ''}${block.buttonUrl ? `<mj-button align="left" padding="24px 32px 30px" href="${block.buttonUrl}" background-color="${buttonBackground}" color="${buttonColor}" border-radius="0" font-size="11px" font-weight="700" text-transform="uppercase">${block.buttonLabel}</mj-button>` : '<mj-spacer height="28px" />'}</mj-column></mj-section>`;
}

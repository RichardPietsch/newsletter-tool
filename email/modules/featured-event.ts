import type { FeaturedEventBlock } from '@/lib/newsletter/schema';
import {
  newsletterEmailClasses as classes,
  newsletterModuleStyles as styles,
  type NewsletterColorPalette,
} from '@/lib/newsletter/module-styles';

export function renderFeaturedEvent(block: FeaturedEventBlock, colors: NewsletterColorPalette = styles.colors) {
  const isWhite = block.background === 'white';
  const backgroundColor = isWhite ? colors.surface : colors.featureBackground;
  const titleColor = isWhite ? colors.text : colors.featureText;
  const overlineColor = isWhite ? colors.accent : colors.featureAccent;
  const dateColor = isWhite ? colors.muted : colors.featureMuted;
  const descriptionColor = isWhite ? colors.text : colors.featureMuted;
  const buttonBackground = isWhite ? colors.featureBackground : colors.featureButtonBackground;
  const buttonColor = isWhite ? colors.featureText : colors.featureButtonText;
  const backgroundClass = isWhite ? classes.surface : classes.featureBackground;
  const titleClass = isWhite ? classes.text : classes.featureText;
  const overlineClass = isWhite ? classes.accent : classes.featureAccent;
  const detailClass = isWhite ? classes.muted : classes.featureMuted;
  const descriptionClass = isWhite ? classes.text : classes.featureMuted;
  const buttonClass = isWhite ? classes.solidButton : classes.featureButton;

  return `<mj-section css-class="${backgroundClass}" background-color="${backgroundColor}" padding="0" border-radius="4px"><mj-column border-radius="4px">${block.image?.src ? `<mj-image src="${block.image.src}" alt="${block.image.decorative ? '' : block.image.alt || ''}" padding="0" />` : ''}<mj-text css-class="${overlineClass}" padding="28px 32px 0" font-size="11px" font-weight="700" letter-spacing="2px" color="${overlineColor}" text-transform="uppercase">${block.overline}</mj-text><mj-text css-class="${titleClass}" padding="8px 32px 0" font-size="30px" line-height="1.2" color="${titleColor}" font-family="Georgia, Times, serif">${block.title}</mj-text>${block.speakerName || block.speakerRole ? `<mj-text css-class="${detailClass}" padding="8px 32px 0" font-size="14px" font-weight="600" color="${dateColor}">${[block.speakerName, block.speakerRole].filter(Boolean).join(' · ')}</mj-text>` : ''}${block.date || block.location ? `<mj-text css-class="${detailClass}" padding="20px 32px 0" font-size="13px" color="${dateColor}">${[block.date, block.location].filter(Boolean).join(' · ')}</mj-text>` : ''}${block.description ? `<mj-text css-class="${descriptionClass}" padding="10px 32px 0" font-size="14px" line-height="1.6" color="${descriptionColor}">${block.description}</mj-text>` : ''}${block.buttonUrl ? `<mj-button css-class="${buttonClass}" align="left" padding="24px 32px 30px" href="${block.buttonUrl}" background-color="${buttonBackground}" color="${buttonColor}" border-radius="0" font-size="11px" font-weight="700" text-transform="uppercase">${block.buttonLabel}</mj-button>` : '<mj-spacer height="28px" />'}</mj-column></mj-section>`;
}

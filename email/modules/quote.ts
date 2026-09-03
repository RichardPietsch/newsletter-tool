import type { QuoteBlock } from '@/lib/newsletter/schema';
import {
  newsletterEmailClasses as classes,
  newsletterModuleStyles as styles,
  type NewsletterColorPalette,
} from '@/lib/newsletter/module-styles';
export function renderQuote(block: QuoteBlock, colors: NewsletterColorPalette = styles.colors) {
  return `<mj-section css-class="${classes.surface}" background-color="${colors.surface}" padding="28px 32px"><mj-column css-class="${classes.accentBorder}" border-left="4px solid ${colors.accent}"><mj-text css-class="${classes.text}" padding="0 0 0 20px" font-size="20px" line-height="1.6" font-style="italic" font-family="Georgia, Times, serif" color="${colors.text}">„${block.quote}“</mj-text>${block.author || block.role ? `<mj-text css-class="${classes.accent}" padding="12px 0 0 20px" font-size="11px" font-weight="700" letter-spacing="1.8px" color="${colors.accent}" text-transform="uppercase">${[block.author, block.role].filter(Boolean).join(' · ')}</mj-text>` : ''}</mj-column></mj-section>`;
}

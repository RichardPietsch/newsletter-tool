import type { SectionHeadingBlock } from '@/lib/newsletter/schema';
import { newsletterEmailClasses as classes, newsletterModuleStyles as styles } from '@/lib/newsletter/module-styles';
export function renderSectionHeading(block: SectionHeadingBlock) {
  return `<mj-section css-class="${classes.background}" background-color="${styles.colors.background}" padding="20px 32px 10px"><mj-column><mj-text css-class="${classes.accent}" padding="0" font-size="11px" font-weight="700" letter-spacing="2.8px" color="${styles.colors.accent}" text-transform="uppercase">${block.label}</mj-text></mj-column></mj-section>`;
}

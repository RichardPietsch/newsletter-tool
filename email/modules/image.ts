import type { ImageBlock } from '@/lib/newsletter/schema';
import { newsletterEmailClasses as classes, newsletterModuleStyles as styles } from '@/lib/newsletter/module-styles';
export function renderImage(b: ImageBlock) {
  if (!b.src) return '';
  const img = `<mj-image src="${b.src}" alt="${b.decorative ? '' : b.alt || ''}" padding="0 24px 20px" />`;
  return `<mj-section css-class="${classes.surface}" background-color="${styles.colors.surface}"><mj-column>${b.href ? `<mj-wrapper padding="0"><mj-column><mj-text><a href="${b.href}">${img}</a></mj-text></mj-column></mj-wrapper>` : img}</mj-column></mj-section>`;
}

import type { ImageBlock } from '@/lib/newsletter/schema';
import {
  newsletterEmailClasses as classes,
  newsletterModuleStyles as styles,
  type NewsletterColorPalette,
} from '@/lib/newsletter/module-styles';
export function renderImage(b: ImageBlock, colors: NewsletterColorPalette = styles.colors) {
  if (!b.src) return '';
  const image = `<mj-image src="${b.src}" alt="${b.alt || ''}" padding="0" border-radius="4px" />`;
  return `<mj-section css-class="${classes.background}" background-color="${colors.background}" padding="0"><mj-column>${image}</mj-column></mj-section>`;
}

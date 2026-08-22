import type { EventBlock } from '@/lib/newsletter/schema';
import { newsletterEmailClasses as classes, newsletterModuleStyles as styles } from '@/lib/newsletter/module-styles';
export function renderEvent(b: EventBlock) {
  const colors = styles.colors;
  return `<mj-section css-class="${classes.surface}" background-color="${colors.surface}" padding="20px 24px" border-radius="4px"><mj-column border-radius="4px">${b.image?.src ? `<mj-image src="${b.image.src}" alt="${b.image.decorative ? '' : b.image.alt || ''}" padding="0 0 16px" />` : ''}<mj-text css-class="${classes.text}" font-size="22px" font-weight="700" color="${colors.text}">${b.title}</mj-text>${b.date || b.location ? `<mj-text css-class="${classes.muted}" color="${colors.muted}">${[b.date, b.location].filter(Boolean).join(' · ')}</mj-text>` : ''}${b.description ? `<mj-text css-class="${classes.text}" color="${colors.text}" line-height="1.6">${b.description}</mj-text>` : ''}${b.buttonUrl ? `<mj-button css-class="${classes.brandButton}" href="${b.buttonUrl}" background-color="${colors.brand}" color="${colors.featureText}">${b.buttonLabel}</mj-button>` : ''}</mj-column></mj-section>`;
}

import type { GlobalSettings } from '@/lib/settings/schema';
import { newsletterEmailClasses as classes, newsletterModuleStyles as styles } from '@/lib/newsletter/module-styles';

export function renderHeader(
  branding: string,
  headerVariantId?: string,
  settings?: GlobalSettings,
  options: { squareBottom?: boolean } = {},
) {
  const variant = settings?.headerVariants.find((item) => item.id === headerVariantId) ?? settings?.headerVariants[0];

  const radius = options.squareBottom ? '4px 4px 0 0' : '4px';
  const colors = styles.colors;

  if (variant) {
    return `<mj-section css-class="${classes.background}" background-color="${colors.background}" padding="24px 0 0"><mj-column css-class="${classes.surface}" background-color="${colors.surface}" border-radius="${radius}"><mj-image src="${variant.imageUrl}" alt="${variant.alt}" width="200px" align="center" padding="20px 32px" /></mj-column></mj-section>`;
  }

  return `<mj-section css-class="${classes.background}" background-color="${colors.background}" padding="24px 0 0"><mj-column css-class="${classes.surface}" background-color="${colors.surface}" border-radius="${radius}"><mj-text css-class="${classes.brand}" align="center" font-size="20px" font-weight="700" color="${colors.brand}" padding="20px 32px">${branding}</mj-text></mj-column></mj-section>`;
}

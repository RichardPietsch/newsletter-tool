import type { GlobalSettings } from '@/lib/settings/schema';
import { newsletterModuleStyles as styles } from '@/lib/newsletter/module-styles';

export function renderHeader(branding: string, headerVariantId?: string, settings?: GlobalSettings, options: { squareBottom?: boolean } = {}) {
  const variant = settings?.headerVariants.find((item) => item.id === headerVariantId) ?? settings?.headerVariants[0];

  const radius = options.squareBottom ? '4px 4px 0 0' : '4px';

  if (variant) {
    return `<mj-section background-color="${styles.newsletterBackground}" padding="24px 0 0"><mj-column background-color="#ffffff" border-radius="${radius}"><mj-image src="${variant.imageUrl}" alt="${variant.alt}" width="200px" align="center" padding="20px 32px" /></mj-column></mj-section>`;
  }

  return `<mj-section background-color="${styles.newsletterBackground}" padding="24px 0 0"><mj-column background-color="#ffffff" border-radius="${radius}"><mj-text align="center" font-size="20px" font-weight="700" color="#1d4ed8" padding="20px 32px">${branding}</mj-text></mj-column></mj-section>`;
}

import type { GlobalSettings } from '@/lib/settings/schema';

export function renderHeader(branding: string, settings?: GlobalSettings) {
  const variant = settings?.headerVariants.find((item) => item.id === settings.activeHeaderVariantId) ?? settings?.headerVariants[0];

  if (variant) {
    return `<mj-section background-color="#ffffff" padding="32px 24px 20px"><mj-column><mj-image src="${variant.imageUrl}" alt="${variant.alt}" padding="0" /><mj-divider border-color="#d7dee8" /></mj-column></mj-section>`;
  }

  return `<mj-section background-color="#ffffff" padding="32px 24px 20px"><mj-column><mj-text font-size="24px" font-weight="700" color="#1d4ed8">${branding}</mj-text><mj-divider border-color="#d7dee8" /></mj-column></mj-section>`;
}

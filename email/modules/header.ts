import type { GlobalSettings } from '@/lib/settings/schema';

export function renderHeader(branding: string, headerVariantId?: string, settings?: GlobalSettings) {
  const variant = settings?.headerVariants.find((item) => item.id === headerVariantId) ?? settings?.headerVariants[0];

  if (variant) {
    return `<mj-section background-color="#ffffff" padding="20px 32px 20px"><mj-column><mj-image src="${variant.imageUrl}" alt="${variant.alt}" width="200px" align="center" padding="0" /></mj-column></mj-section>`;
  }

  return `<mj-section background-color="#ffffff" padding="20px 32px 20px"><mj-column><mj-text align="center" font-size="20px" font-weight="700" color="#1d4ed8" padding="0">${branding}</mj-text></mj-column></mj-section>`;
}

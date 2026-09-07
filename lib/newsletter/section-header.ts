import type { BackgroundSectionBlock } from './schema';
import type { GlobalSettings } from '@/lib/settings/schema';

export type ResolvedSectionHeaderImage = {
  src: string;
  alt: string;
  roundedCorners: boolean;
};

export function resolveSectionHeaderImage(
  block: BackgroundSectionBlock,
  settings?: GlobalSettings,
): ResolvedSectionHeaderImage | undefined {
  const sectionHeader = block.sectionHeader;
  if (!sectionHeader) return undefined;
  if (sectionHeader.source === 'asset') {
    return { src: sectionHeader.src, alt: sectionHeader.alt, roundedCorners: false };
  }
  const variant = settings?.headerVariants.find((entry) => entry.id === sectionHeader.headerVariantId);
  return variant ? { src: variant.imageUrl, alt: variant.alt, roundedCorners: variant.roundedCorners } : undefined;
}

export function usedHeaderVariantIdsFromDocument(document: unknown) {
  const ids = new Set<string>();
  if (!document || typeof document !== 'object' || Array.isArray(document)) return [];
  const blocks = (document as { blocks?: unknown }).blocks;
  if (!Array.isArray(blocks)) return [];

  for (const input of blocks) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) continue;
    const block = input as Record<string, unknown>;
    if (block.type === 'header' && typeof block.headerVariantId === 'string') ids.add(block.headerVariantId);
    if (block.type === 'backgroundSection') {
      const sectionHeader = block.sectionHeader;
      if (sectionHeader && typeof sectionHeader === 'object' && !Array.isArray(sectionHeader)) {
        const source = sectionHeader as Record<string, unknown>;
        if (source.source === 'headerVariant' && typeof source.headerVariantId === 'string') {
          ids.add(source.headerVariantId);
        }
      }
    }
  }

  return Array.from(ids);
}

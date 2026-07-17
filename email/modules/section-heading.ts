import type { SectionHeadingBlock } from '@/lib/newsletter/schema';
export function renderSectionHeading(block: SectionHeadingBlock) {
  return `<mj-section background-color="#f4f1ec" padding="20px 32px 10px"><mj-column><mj-text padding="0" font-size="11px" font-weight="700" letter-spacing="2.8px" color="#a63a3a" text-transform="uppercase">${block.label}</mj-text></mj-column></mj-section>`;
}

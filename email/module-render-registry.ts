import { renderQuote } from '@/email/modules/quote';
import { renderSectionHeading } from '@/email/modules/section-heading';
import type { RegisteredNewsletterBlock } from '@/lib/newsletter/module-registry';
import type { NewsletterColorPalette } from '@/lib/newsletter/module-styles';

export function renderRegisteredEmailModule(block: RegisteredNewsletterBlock, colors?: NewsletterColorPalette) {
  if (block.type === 'quote') return renderQuote(block, colors);
  return renderSectionHeading(block, colors);
}

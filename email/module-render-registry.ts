import { renderQuote } from '@/email/modules/quote';
import { renderSectionHeading } from '@/email/modules/section-heading';
import type { RegisteredNewsletterBlock } from '@/lib/newsletter/module-registry';

export function renderRegisteredEmailModule(block: RegisteredNewsletterBlock) {
  if (block.type === 'quote') return renderQuote(block);
  return renderSectionHeading(block);
}

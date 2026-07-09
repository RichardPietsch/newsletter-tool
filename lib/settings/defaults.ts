import type { GlobalSettings } from './schema';

export const defaultFooterRichText = {
  type: 'doc' as const,
  content: [
    {
      type: 'paragraph',
      content: [{ type: 'text', text: 'ACME GmbH · Musterstraße 1 · 12345 Berlin' }],
    },
    {
      type: 'paragraph',
      content: [{ type: 'text', text: 'Impressum und Datenschutz werden zentral gepflegt.' }],
    },
  ],
};

export function createDefaultSettings(): GlobalSettings {
  return {
    headerVariants: [],
    footerRichText: defaultFooterRichText,
  };
}

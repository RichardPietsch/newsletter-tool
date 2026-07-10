import type { GlobalSettings } from './schema';

function appAssetUrl(path: string) {
  return new URL(path, process.env.APP_URL || 'http://localhost:3000').toString();
}

export function createDefaultHeaderVariants(): GlobalSettings['headerVariants'] {
  return [
    {
      id: 'agc',
      name: 'AGC',
      imageUrl: appAssetUrl('/assets/headers/header-agc.jpg'),
      alt: 'AGC Newsletter Header',
    },
    {
      id: 'agc-junioren',
      name: 'AGC Junioren',
      imageUrl: appAssetUrl('/assets/headers/header-agc-junioren.jpg'),
      alt: 'AGC Junioren Newsletter Header',
    },
  ];
}

export const defaultFooterRichText = {
  type: 'doc' as const,
  content: [
    {
      type: 'paragraph',
      content: [{ type: 'text', text: 'AGC · Newsletter' }],
    },
    {
      type: 'paragraph',
      content: [{ type: 'text', text: 'Impressum und Datenschutz werden zentral gepflegt.' }],
    },
  ],
};

export function createDefaultSettings(): GlobalSettings {
  return {
    headerVariants: createDefaultHeaderVariants(),
    footerRichText: defaultFooterRichText,
  };
}

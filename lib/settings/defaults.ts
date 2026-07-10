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
      content: [{ type: 'text', text: 'Clubbüro:  +49 40-450 155-12/13  office@anglogermanclub.de' }],
    },
    {
      type: 'paragraph',
      content: [{ type: 'text', text: 'Gastronomie:  +49 40-450 155-0  gastronomie@anglogermanclub.de' }],
    },
    {
      type: 'paragraph',
      content: [],
    },
    {
      type: 'paragraph',
      content: [{ type: 'text', text: 'Harvestehuder Weg 44  •  20149 Hamburg  •  Germany' }],
    },
  ],
};

export function createDefaultSettings(): GlobalSettings {
  return {
    headerVariants: createDefaultHeaderVariants(),
    footerRichText: defaultFooterRichText,
  };
}

function footerLines(settings: GlobalSettings) {
  return (settings.footerRichText.content ?? []).map((node: any) => (node.content ?? []).map((child: any) => child.text ?? '').join(''));
}

export function applyDefaultSettingsFallbacks(settings: GlobalSettings): GlobalSettings {
  const defaults = createDefaultSettings();
  const currentFooterLines = footerLines(settings);
  const usesPreviousDefaultFooter =
    currentFooterLines.join('\n') === 'AGC · Newsletter\nImpressum und Datenschutz werden zentral gepflegt.' ||
    currentFooterLines.join('\n') === 'ACME GmbH · Musterstraße 1 · 12345 Berlin\nImpressum und Datenschutz werden zentral gepflegt.';

  return {
    ...settings,
    headerVariants: settings.headerVariants.length > 0 ? settings.headerVariants : defaults.headerVariants,
    footerRichText: usesPreviousDefaultFooter ? defaults.footerRichText : settings.footerRichText,
  };
}

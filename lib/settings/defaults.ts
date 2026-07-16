import { serverEnv } from '@/lib/env';
import type { GlobalSettings } from './schema';

function appAssetUrl(path: string) {
  return new URL(path, serverEnv.appUrl).toString();
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
    {
      id: 'agc-gastro',
      name: 'AGC Gastro',
      imageUrl: appAssetUrl('/assets/headers/header-agc-gastronomie.jpg'),
      alt: 'AGC Gastro Newsletter Header',
    },
  ];
}

export const defaultFooterRichText = {
  type: 'doc' as const,
  content: [
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: 'Clubbüro:', marks: [{ type: 'bold' }] },
        { type: 'text', text: '  +49 40-450 155-12/13  ' },
        {
          type: 'text',
          text: 'office@anglogermanclub.de',
          marks: [{ type: 'link', attrs: { href: 'mailto:office@anglogermanclub.de' } }],
        },
      ],
    },
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: 'Gastronomie:', marks: [{ type: 'bold' }] },
        { type: 'text', text: '  +49 40-450 155-0  ' },
        {
          type: 'text',
          text: 'gastronomie@anglogermanclub.de',
          marks: [{ type: 'link', attrs: { href: 'mailto:gastronomie@anglogermanclub.de' } }],
        },
      ],
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
  return (settings.footerRichText.content ?? []).map((node: any) =>
    (node.content ?? []).map((child: any) => child.text ?? '').join(''),
  );
}

export function applyDefaultSettingsFallbacks(settings: GlobalSettings): GlobalSettings {
  const defaults = createDefaultSettings();
  const currentFooterLines = footerLines(settings);
  const usesPreviousDefaultFooter =
    currentFooterLines.join('\n') === 'AGC · Newsletter\nImpressum und Datenschutz werden zentral gepflegt.' ||
    currentFooterLines.join('\n') ===
      'ACME GmbH · Musterstraße 1 · 12345 Berlin\nImpressum und Datenschutz werden zentral gepflegt.';

  const missingDefaultHeaderVariants = defaults.headerVariants.filter(
    (defaultVariant) => !settings.headerVariants.some((variant) => variant.id === defaultVariant.id),
  );

  return {
    ...settings,
    headerVariants: [...settings.headerVariants, ...missingDefaultHeaderVariants],
    footerRichText: usesPreviousDefaultFooter ? defaults.footerRichText : settings.footerRichText,
  };
}

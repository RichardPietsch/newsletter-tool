import { publicAppUrl } from '@/lib/app-url';
import type { TiptapDoc, TiptapNode } from '@/lib/newsletter/schema';
import { globalSettingsSchema, type GlobalSettings, type GlobalSettingsInput } from './schema';
import { newsletterThemePalettes } from '@/lib/newsletter/module-styles';

function appAssetUrl(path: string) {
  return publicAppUrl(path).toString();
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

export const defaultFooterRichText: TiptapDoc = {
  type: 'doc',
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
    colors: {
      light: { ...newsletterThemePalettes.light },
      dark: { ...newsletterThemePalettes.dark },
    },
  };
}

function textFromNode(node: TiptapNode): string {
  if (node.type === 'text') return node.text;
  if (!('content' in node)) return '';
  return (node.content ?? []).map(textFromNode).join('');
}

function footerLines(settings: GlobalSettings) {
  return (settings.footerRichText.content ?? []).map(textFromNode);
}

export function applyDefaultSettingsFallbacks(settings: GlobalSettingsInput): GlobalSettings {
  const defaults = createDefaultSettings();
  const usesLegacySettingsShape = settings.colors === undefined;
  const current = globalSettingsSchema.parse(settings);
  const currentFooterLines = footerLines(current);
  const usesPreviousDefaultFooter =
    currentFooterLines.join('\n') === 'AGC · Newsletter\nImpressum und Datenschutz werden zentral gepflegt.' ||
    currentFooterLines.join('\n') ===
      'ACME GmbH · Musterstraße 1 · 12345 Berlin\nImpressum und Datenschutz werden zentral gepflegt.';

  const missingDefaultHeaderVariants = usesLegacySettingsShape
    ? defaults.headerVariants.filter(
        (defaultVariant) => !current.headerVariants.some((variant) => variant.id === defaultVariant.id),
      )
    : [];

  return {
    ...current,
    headerVariants: [...current.headerVariants, ...missingDefaultHeaderVariants],
    footerRichText: usesPreviousDefaultFooter ? defaults.footerRichText : current.footerRichText,
  };
}

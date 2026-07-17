import { describe, expect, it } from 'vitest';
import { renderFooter } from '@/email/modules/footer';
import { serverEnv } from '@/lib/env';
import type { TiptapNode } from '@/lib/newsletter/schema';
import { applyDefaultSettingsFallbacks, createDefaultSettings } from '@/lib/settings/defaults';
import { globalSettingsSchema } from '@/lib/settings/schema';

function textFromNode(node: TiptapNode): string {
  if (node.type === 'text') return node.text;
  if (!('content' in node)) return '';
  return (node.content ?? []).map(textFromNode).join('');
}

function contentFromNode(node: TiptapNode | undefined) {
  return node && 'content' in node ? node.content : undefined;
}

function marksFromNode(node: TiptapNode | undefined) {
  return node?.type === 'text' ? node.marks : undefined;
}

describe('settings defaults', () => {
  it('prefills AGC header variants with public app asset URLs', () => {
    const settings = createDefaultSettings();
    const headerUrl = (filename: string) => new URL(`/assets/headers/${filename}`, serverEnv.appUrl).toString();

    expect(globalSettingsSchema.parse(settings).headerVariants).toEqual([
      {
        id: 'agc',
        name: 'AGC',
        imageUrl: headerUrl('header-agc.jpg'),
        alt: 'AGC Newsletter Header',
      },
      {
        id: 'agc-junioren',
        name: 'AGC Junioren',
        imageUrl: headerUrl('header-agc-junioren.jpg'),
        alt: 'AGC Junioren Newsletter Header',
      },
      {
        id: 'agc-gastro',
        name: 'AGC Gastro',
        imageUrl: headerUrl('header-agc-gastronomie.jpg'),
        alt: 'AGC Gastro Newsletter Header',
      },
    ]);
    expect(settings.footerRichText.content?.map(textFromNode)).toEqual([
      'Clubbüro:  +49 40-450 155-12/13  office@anglogermanclub.de',
      'Gastronomie:  +49 40-450 155-0  gastronomie@anglogermanclub.de',
      '',
      'Harvestehuder Weg 44  •  20149 Hamburg  •  Germany',
    ]);
    expect(marksFromNode(contentFromNode(settings.footerRichText.content?.[0])?.[0])).toEqual([{ type: 'bold' }]);
    expect(marksFromNode(contentFromNode(settings.footerRichText.content?.[0])?.[2])).toEqual([
      { type: 'link', attrs: { href: 'mailto:office@anglogermanclub.de' } },
    ]);
    expect(marksFromNode(contentFromNode(settings.footerRichText.content?.[1])?.[0])).toEqual([{ type: 'bold' }]);
    expect(marksFromNode(contentFromNode(settings.footerRichText.content?.[1])?.[2])).toEqual([
      { type: 'link', attrs: { href: 'mailto:gastronomie@anglogermanclub.de' } },
    ]);
  });

  it('upgrades old placeholder defaults without overwriting custom settings', () => {
    const settings = createDefaultSettings();
    const upgraded = applyDefaultSettingsFallbacks({
      headerVariants: [],
      footerRichText: {
        type: 'doc',
        content: [
          { type: 'paragraph', content: [{ type: 'text', text: 'AGC · Newsletter' }] },
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Impressum und Datenschutz werden zentral gepflegt.' }],
          },
        ],
      },
    });

    expect(upgraded.headerVariants).toEqual(settings.headerVariants);
    expect(upgraded.footerRichText).toEqual(settings.footerRichText);
  });

  it('renders footer defaults with bold labels and mailto links', () => {
    const html = renderFooter('', '', createDefaultSettings());

    expect(html).toContain('<strong>Clubbüro:</strong>');
    expect(html).toContain('<a href="mailto:office@anglogermanclub.de">office@anglogermanclub.de</a>');
    expect(html).toContain('<strong>Gastronomie:</strong>');
    expect(html).toContain('<a href="mailto:gastronomie@anglogermanclub.de">gastronomie@anglogermanclub.de</a>');
  });
});

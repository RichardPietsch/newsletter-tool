import { describe, expect, it } from 'vitest';
import { renderFooter } from '@/email/modules/footer';
import { applyDefaultSettingsFallbacks, createDefaultSettings } from '@/lib/settings/defaults';
import { globalSettingsSchema } from '@/lib/settings/schema';

describe('settings defaults', () => {
  it('prefills AGC header variants with public app asset URLs', () => {
    const previousAppUrl = process.env.APP_URL;
    process.env.APP_URL = 'https://newsletter.example.com';

    const settings = createDefaultSettings();

    if (previousAppUrl === undefined) {
      delete process.env.APP_URL;
    } else {
      process.env.APP_URL = previousAppUrl;
    }

    expect(globalSettingsSchema.parse(settings).headerVariants).toEqual([
      {
        id: 'agc',
        name: 'AGC',
        imageUrl: 'https://newsletter.example.com/assets/headers/header-agc.jpg',
        alt: 'AGC Newsletter Header',
      },
      {
        id: 'agc-junioren',
        name: 'AGC Junioren',
        imageUrl: 'https://newsletter.example.com/assets/headers/header-agc-junioren.jpg',
        alt: 'AGC Junioren Newsletter Header',
      },
      {
        id: 'agc-gastro',
        name: 'AGC Gastro',
        imageUrl: 'https://newsletter.example.com/assets/headers/header-agc-gastronomie.jpg',
        alt: 'AGC Gastro Newsletter Header',
      },
    ]);
    expect(settings.footerRichText.content?.map((node) => node.content?.map((child: any) => child.text ?? '').join('') ?? '')).toEqual([
      'Clubbüro:  +49 40-450 155-12/13  office@anglogermanclub.de',
      'Gastronomie:  +49 40-450 155-0  gastronomie@anglogermanclub.de',
      '',
      'Harvestehuder Weg 44  •  20149 Hamburg  •  Germany',
    ]);
    expect(settings.footerRichText.content?.[0]?.content?.[0]?.marks).toEqual([{ type: 'bold' }]);
    expect(settings.footerRichText.content?.[0]?.content?.[2]?.marks).toEqual([{ type: 'link', attrs: { href: 'mailto:office@anglogermanclub.de' } }]);
    expect(settings.footerRichText.content?.[1]?.content?.[0]?.marks).toEqual([{ type: 'bold' }]);
    expect(settings.footerRichText.content?.[1]?.content?.[2]?.marks).toEqual([{ type: 'link', attrs: { href: 'mailto:gastronomie@anglogermanclub.de' } }]);
  });

  it('upgrades old placeholder defaults without overwriting custom settings', () => {
    const settings = createDefaultSettings();
    const upgraded = applyDefaultSettingsFallbacks({
      headerVariants: [],
      footerRichText: {
        type: 'doc',
        content: [
          { type: 'paragraph', content: [{ type: 'text', text: 'AGC · Newsletter' }] },
          { type: 'paragraph', content: [{ type: 'text', text: 'Impressum und Datenschutz werden zentral gepflegt.' }] },
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

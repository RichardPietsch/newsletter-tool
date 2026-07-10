import { describe, expect, it } from 'vitest';
import { createDefaultSettings } from '@/lib/settings/defaults';
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
    ]);
  });
});

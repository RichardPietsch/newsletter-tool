import { describe, expect, it } from 'vitest';
import {
  deriveNewsletterColorPalette,
  newsletterContrastRatio,
  newsletterThemeColorTokens,
} from '@/lib/newsletter/module-styles';
import { createDefaultSettings } from '@/lib/settings/defaults';
import { parseThemeYaml, serializeThemeYaml, THEME_YAML_MAX_BYTES } from '@/lib/settings/theme-yaml';

describe('tenant theme YAML', () => {
  it('round-trips the eight light and dark base colors', () => {
    const colors = createDefaultSettings().colors;
    const serialized = serializeThemeYaml(colors);

    expect(serialized).toContain('version: 1');
    expect(parseThemeYaml(serialized)).toEqual(colors);
    expect(Object.keys(parseThemeYaml(serialized).light)).toEqual(newsletterThemeColorTokens);
  });

  it('rejects incomplete, unknown and oversized theme documents', () => {
    expect(() => parseThemeYaml('version: 1\nlight: {}\ndark: {}\n')).toThrow();
    expect(() => parseThemeYaml(`${serializeThemeYaml(createDefaultSettings().colors)}unknown: true\n`)).toThrow();
    expect(() =>
      parseThemeYaml(serializeThemeYaml(createDefaultSettings().colors).replace('#1d4ed8', 'blue')),
    ).toThrow();
    expect(() => parseThemeYaml(' '.repeat(THEME_YAML_MAX_BYTES + 1))).toThrow('Theme-Datei ist zu groß.');
  });

  it('derives readable feature and button colors from the base palette', () => {
    for (const base of Object.values(createDefaultSettings().colors)) {
      const palette = deriveNewsletterColorPalette(base);

      expect(newsletterContrastRatio(palette.featureText, palette.featureBackground)).toBeGreaterThanOrEqual(4.5);
      expect(newsletterContrastRatio(palette.featureMuted, palette.featureBackground)).toBeGreaterThanOrEqual(4.5);
      expect(newsletterContrastRatio(palette.featureAccent, palette.featureBackground)).toBeGreaterThanOrEqual(4.5);
      expect(
        newsletterContrastRatio(palette.featureButtonText, palette.featureButtonBackground),
      ).toBeGreaterThanOrEqual(4.5);
      expect(newsletterContrastRatio(palette.brandText, palette.brand)).toBeGreaterThanOrEqual(4.5);
    }
  });
});

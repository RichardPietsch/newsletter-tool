import { describe, expect, it } from 'vitest';
import { compareLocaleKeys, dictionaries, flattenUiText, t } from '@/lib/i18n';

describe('ui text dictionary', () => {
  it('resolves typed UI copy keys from the central dictionary', () => {
    expect(t('save.saved')).toBe('Gespeichert');
    expect(t('image.choose')).toBe('Bild auswählen');
  });

  it('exposes all registered UI texts for copy governance checks', () => {
    expect(flattenUiText()).toContain('Speichern fehlgeschlagen');
  });

  it('resolves the same typed key for an explicit locale', () => {
    expect(t('save.saved', 'de')).toBe('Gespeichert');
    expect(t('save.saved', 'en')).toBe('Saved');
    expect(t('onboarding.next', 'en')).toBe('Next');
  });

  it('keeps every locale structurally aligned with German', () => {
    for (const [locale, dictionary] of Object.entries(dictionaries)) {
      expect(compareLocaleKeys(dictionaries.de, dictionary), locale).toEqual({ missing: [], extra: [] });
    }
  });

  it('reports missing and additional locale keys', () => {
    expect(compareLocaleKeys({ save: { saved: 'Saved' } }, { save: { failed: 'Failed' } })).toEqual({
      missing: ['save.saved'],
      extra: ['save.failed'],
    });
  });
});

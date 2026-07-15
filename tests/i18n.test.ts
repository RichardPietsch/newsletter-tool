import { describe, expect, it } from 'vitest';
import { flattenUiText, t } from '@/lib/i18n';

describe('ui text dictionary', () => {
  it('resolves typed UI copy keys from the central dictionary', () => {
    expect(t('save.saved')).toBe('Gespeichert');
    expect(t('image.choose')).toBe('Bild auswählen');
  });

  it('exposes all registered UI texts for copy governance checks', () => {
    expect(flattenUiText()).toContain('Speichern fehlgeschlagen');
  });
});

import { describe, expect, it } from 'vitest';
import {
  createRegisteredModule,
  newsletterModuleRegistry,
  registeredModuleTypes,
} from '@/lib/newsletter/module-registry';
import { renderRegisteredEmailModule } from '@/email/module-render-registry';
import { createBlock } from '@/lib/newsletter/defaults';

describe('newsletter module registry', () => {
  it('exposes incremental metadata for registered modules', () => {
    expect(registeredModuleTypes).toEqual(['quote', 'sectionHeading']);
    expect(newsletterModuleRegistry.quote).toMatchObject({ type: 'quote', labelKey: 'misc.quote' });
    expect(newsletterModuleRegistry.sectionHeading).toMatchObject({
      type: 'sectionHeading',
      labelKey: 'misc.sectionHeading',
    });
  });

  it('creates defaults and validates them via registered schemas', () => {
    const quote = createRegisteredModule('quote');
    const heading = createRegisteredModule('sectionHeading');

    expect(newsletterModuleRegistry.quote.schema.safeParse(quote).success).toBe(true);
    expect(newsletterModuleRegistry.sectionHeading.schema.safeParse(heading).success).toBe(true);
    expect(createBlock('quote')).toMatchObject({ type: 'quote', quote: 'Ein prägnantes Zitat für den Newsletter.' });
    expect(createBlock('sectionHeading')).toMatchObject({ type: 'sectionHeading', label: 'Abschnitt' });
  });

  it('routes registered modules to their email renderers', () => {
    expect(renderRegisteredEmailModule({ ...createRegisteredModule('quote'), quote: 'Registry Zitat' })).toContain(
      'Registry Zitat',
    );
    expect(
      renderRegisteredEmailModule({ ...createRegisteredModule('sectionHeading'), label: 'Registry Abschnitt' }),
    ).toContain('Registry Abschnitt');
  });
});

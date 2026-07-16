import { nanoid } from 'nanoid';
import { createRegisteredModule, isRegisteredModuleType } from './module-registry';
import type { NewsletterBlock, NewsletterDocument, EventItem } from './schema';
export const emptyTiptapDoc = {
  type: 'doc' as const,
  content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Neuer Textbaustein' }] }],
};
export function createDefaultDocument(title = 'Neuer Newsletter'): NewsletterDocument {
  return {
    schemaVersion: 1,
    title,
    blocks: [
      { id: nanoid(), type: 'header', locked: true, branding: 'AGC Newsletter', headerVariantId: 'agc' },
      {
        id: nanoid(),
        type: 'footer',
        locked: true,
        contact: 'AGC · Newsletter',
        legal: 'Impressum und Datenschutz werden zentral gepflegt.',
      },
    ],
  };
}
export function createEventItem(): EventItem {
  return {
    id: nanoid(),
    category: 'Veranstaltung',
    title: 'Neue Veranstaltung',
    date: 'Datum und Uhrzeit',
    buttonLabel: 'Anmeldung',
  };
}
export function createBlock(
  type: 'text' | 'event' | 'image' | 'featuredEvent' | 'quote' | 'sectionHeading' | 'eventGrid',
): NewsletterBlock {
  if (type === 'text') return { id: nanoid(), type: 'text', content: emptyTiptapDoc, background: 'white' };
  if (type === 'event')
    return {
      id: nanoid(),
      type: 'event',
      title: 'Neue Veranstaltung',
      description: 'Kurzbeschreibung der Veranstaltung',
    };
  if (type === 'featuredEvent')
    return {
      id: nanoid(),
      type: 'featuredEvent',
      overline: 'Featured Event',
      background: 'blue',
      title: 'Besondere Veranstaltung',
      date: 'Datum und Uhrzeit',
      buttonLabel: 'Mehr erfahren',
    };
  if (isRegisteredModuleType(type)) return createRegisteredModule(type);
  if (type === 'eventGrid')
    return {
      id: nanoid(),
      type: 'eventGrid',
      heading: 'Kommende Veranstaltungen',
      layout: 'grid',
      items: [createEventItem(), createEventItem()],
    };
  return { id: nanoid(), type: 'image', decorative: false, alt: '' };
}

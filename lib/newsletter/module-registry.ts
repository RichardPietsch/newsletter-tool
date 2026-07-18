import { nanoid } from 'nanoid';
import type { UiTextKey } from '@/lib/i18n';
import {
  quoteBlockSchema,
  sectionHeadingBlockSchema,
  type NewsletterBlock,
  type QuoteBlock,
  type SectionHeadingBlock,
} from './schema';

export type RegisteredModuleType = 'quote' | 'sectionHeading';
export type RegisteredNewsletterBlock = QuoteBlock | SectionHeadingBlock;

type ModuleRegistryEntry<TBlock extends RegisteredNewsletterBlock> = {
  type: TBlock['type'];
  labelKey: UiTextKey;
  createDefault: () => TBlock;
  schema: typeof quoteBlockSchema | typeof sectionHeadingBlockSchema;
};

export const newsletterModuleRegistry = {
  quote: {
    type: 'quote',
    labelKey: 'misc.quote',
    createDefault: (): QuoteBlock => ({
      id: nanoid(),
      type: 'quote',
      quote: 'Ein prägnantes Zitat für den Newsletter.',
      author: 'Name',
      role: 'Funktion',
    }),
    schema: quoteBlockSchema,
  },
  sectionHeading: {
    type: 'sectionHeading',
    labelKey: 'misc.sectionHeading',
    createDefault: (): SectionHeadingBlock => ({ id: nanoid(), type: 'sectionHeading', label: 'Abschnitt' }),
    schema: sectionHeadingBlockSchema,
  },
} satisfies {
  quote: ModuleRegistryEntry<QuoteBlock>;
  sectionHeading: ModuleRegistryEntry<SectionHeadingBlock>;
};

export const registeredModuleTypes = Object.keys(newsletterModuleRegistry) as RegisteredModuleType[];

export function isRegisteredModuleType(type: NewsletterBlock['type']): type is RegisteredModuleType {
  return type === 'quote' || type === 'sectionHeading';
}

export function isRegisteredNewsletterBlock(block: NewsletterBlock): block is RegisteredNewsletterBlock {
  return isRegisteredModuleType(block.type);
}

export function createRegisteredModule(type: 'quote'): QuoteBlock;
export function createRegisteredModule(type: 'sectionHeading'): SectionHeadingBlock;
export function createRegisteredModule(type: RegisteredModuleType): RegisteredNewsletterBlock;
export function createRegisteredModule(type: RegisteredModuleType): RegisteredNewsletterBlock {
  if (type === 'quote') return newsletterModuleRegistry.quote.createDefault();
  return newsletterModuleRegistry.sectionHeading.createDefault();
}

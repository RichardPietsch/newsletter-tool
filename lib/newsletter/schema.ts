import { z } from 'zod';
import { t } from '@/lib/i18n';
import { newsletterEditableTextColors, newsletterLegacyTextColors } from './module-styles';
import { CURRENT_NEWSLETTER_SCHEMA_VERSION } from './migrations/version';
export const allowedUrl = (v: string) => {
  try {
    const u = new URL(v);
    return ['https:', 'http:', 'mailto:'].includes(u.protocol);
  } catch {
    return false;
  }
};
const url = z.string().trim().refine(allowedUrl, t('validation.invalidUrl'));
const base = z.object({ id: z.string().min(1), locked: z.boolean().optional() });

export const allowedTextColors = [...newsletterEditableTextColors, ...newsletterLegacyTextColors] as const;
const allowedTextColorSchema = z.enum(allowedTextColors);
const headingAttrsSchema = z.object({ level: z.union([z.literal(2), z.literal(3)]) }).strict();
const linkAttrsSchema = z
  .object({
    href: url,
    target: z.string().nullable().optional(),
    rel: z.string().nullable().optional(),
    class: z.string().nullable().optional(),
  })
  .strict();
const textStyleAttrsSchema = z.object({ color: allowedTextColorSchema.optional() }).strict();

const boldMarkSchema = z.object({ type: z.literal('bold') }).strict();
const italicMarkSchema = z.object({ type: z.literal('italic') }).strict();
const underlineMarkSchema = z.object({ type: z.literal('underline') }).strict();
const linkMarkSchema = z.object({ type: z.literal('link'), attrs: linkAttrsSchema }).strict();
const textStyleMarkSchema = z.object({ type: z.literal('textStyle'), attrs: textStyleAttrsSchema.optional() }).strict();
export const tiptapMarkSchema = z.union([
  boldMarkSchema,
  italicMarkSchema,
  underlineMarkSchema,
  linkMarkSchema,
  textStyleMarkSchema,
]);
export type TiptapMark = z.infer<typeof tiptapMarkSchema>;

export type TiptapNode =
  | { type: 'paragraph'; content?: TiptapNode[] }
  | { type: 'blockquote'; content?: TiptapNode[] }
  | { type: 'heading'; attrs: z.infer<typeof headingAttrsSchema>; content?: TiptapNode[] }
  | { type: 'text'; text: string; marks?: TiptapMark[] }
  | { type: 'hardBreak' }
  | { type: 'bulletList'; content?: TiptapNode[] }
  | { type: 'orderedList'; content?: TiptapNode[] }
  | { type: 'listItem'; content?: TiptapNode[] };

const tiptapNodeSchema: z.ZodType<TiptapNode> = z.lazy(() =>
  z.union([
    z.object({ type: z.literal('paragraph'), content: z.array(tiptapNodeSchema).optional() }).strict(),
    z.object({ type: z.literal('blockquote'), content: z.array(tiptapNodeSchema).optional() }).strict(),
    z
      .object({ type: z.literal('heading'), attrs: headingAttrsSchema, content: z.array(tiptapNodeSchema).optional() })
      .strict(),
    z.object({ type: z.literal('text'), text: z.string(), marks: z.array(tiptapMarkSchema).optional() }).strict(),
    z.object({ type: z.literal('hardBreak') }).strict(),
    z.object({ type: z.literal('bulletList'), content: z.array(tiptapNodeSchema).optional() }).strict(),
    z.object({ type: z.literal('orderedList'), content: z.array(tiptapNodeSchema).optional() }).strict(),
    z.object({ type: z.literal('listItem'), content: z.array(tiptapNodeSchema).optional() }).strict(),
  ]),
);

export const tiptapDocSchema = z
  .object({ type: z.literal('doc'), content: z.array(tiptapNodeSchema).optional() })
  .strict();
export type TiptapDoc = z.infer<typeof tiptapDocSchema>;
export const headerBlockSchema = base.extend({
  type: z.literal('header'),
  locked: z.literal(true),
  branding: z.string(),
  headerVariantId: z.string().optional(),
});
export const footerBlockSchema = base.extend({
  type: z.literal('footer'),
  locked: z.literal(true),
  contact: z.string(),
  legal: z.string(),
});
export const textBlockSchema = base.extend({
  type: z.literal('text'),
  content: tiptapDocSchema,
  background: z.enum(['white', 'blue']).default('white'),
});
const imageFields = {
  assetId: z.string().optional(),
  src: url.optional().or(z.literal('')),
  alt: z.string().optional(),
};
export const imageBlockSchema = base.extend({ type: z.literal('image'), ...imageFields }).superRefine((v, c) => {
  if ((v.src || v.assetId) && !v.alt?.trim())
    c.addIssue({ code: 'custom', path: ['alt'], message: t('validation.altRequired') });
});
export const eventItemSchema = z
  .object({
    id: z.string().min(1),
    sourceEventId: z.string().optional(),
    image: z.object(imageFields).optional(),
    category: z.string().optional(),
    title: z.string().min(1, t('validation.titleRequired')),
    speakerName: z.string().optional(),
    speakerRole: z.string().optional(),
    date: z.string().optional(),
    location: z.string().optional(),
    description: z.string().optional(),
    buttonLabel: z.string().optional(),
    buttonUrl: url.optional().or(z.literal('')),
  })
  .superRefine((v, c) => {
    if (v.buttonUrl && !v.buttonLabel?.trim())
      c.addIssue({ code: 'custom', path: ['buttonLabel'], message: t('validation.buttonLabelRequired') });
    if (v.image?.src && !v.image.alt?.trim())
      c.addIssue({ code: 'custom', path: ['image', 'alt'], message: t('validation.altRequired') });
  });
export const eventBlockSchema = base
  .extend({
    type: z.literal('event'),
    sourceEventId: z.string().optional(),
    image: z.object(imageFields).optional(),
    category: z.string().optional(),
    title: z.string().min(1, t('validation.titleRequired')),
    speakerName: z.string().optional(),
    speakerRole: z.string().optional(),
    date: z.string().optional(),
    location: z.string().optional(),
    description: z.string().optional(),
    buttonLabel: z.string().optional(),
    buttonUrl: url.optional().or(z.literal('')),
  })
  .superRefine((v, c) => {
    if (v.buttonUrl && !v.buttonLabel?.trim())
      c.addIssue({ code: 'custom', path: ['buttonLabel'], message: t('validation.buttonLabelRequired') });
    if (v.image?.src && !v.image.alt?.trim())
      c.addIssue({ code: 'custom', path: ['image', 'alt'], message: t('validation.altRequired') });
  });
export const featuredEventBlockSchema = base
  .extend({
    type: z.literal('featuredEvent'),
    sourceEventId: z.string().optional(),
    overline: z.string().default('Featured Event'),
    background: z.enum(['blue', 'white']).default('blue'),
    image: z.object(imageFields).optional(),
    title: z.string().min(1, t('validation.titleRequired')),
    speakerName: z.string().optional(),
    speakerRole: z.string().optional(),
    date: z.string().optional(),
    location: z.string().optional(),
    description: z.string().optional(),
    buttonLabel: z.string().optional(),
    buttonUrl: url.optional().or(z.literal('')),
  })
  .superRefine((v, c) => {
    if (v.buttonUrl && !v.buttonLabel?.trim())
      c.addIssue({ code: 'custom', path: ['buttonLabel'], message: t('validation.buttonLabelRequired') });
    if (v.image?.src && !v.image.alt?.trim())
      c.addIssue({ code: 'custom', path: ['image', 'alt'], message: t('validation.altRequired') });
  });
export const quoteBlockSchema = base.extend({
  type: z.literal('quote'),
  quote: z.string().min(1, t('validation.quoteRequired')),
  author: z.string().optional(),
  role: z.string().optional(),
});
export const sectionHeadingBlockSchema = base.extend({
  type: z.literal('sectionHeading'),
  label: z.string().min(1, t('validation.sectionHeadingRequired')),
});
export const eventGridBlockSchema = base.extend({
  type: z.literal('eventGrid'),
  heading: z.string().optional(),
  layout: z.enum(['grid', 'list']).default('grid'),
  items: z.array(eventItemSchema).min(1, t('validation.eventRequired')),
});
export const sectionHeaderSchema = z.discriminatedUnion('source', [
  z.object({ source: z.literal('headerVariant'), headerVariantId: z.string().min(1) }),
  z.object({
    source: z.literal('asset'),
    assetId: z.string().optional(),
    src: url,
    alt: z.string().trim().min(1, t('validation.altRequired')),
  }),
]);
export const newsletterContentBlockSchema = z.union([
  textBlockSchema,
  eventBlockSchema,
  featuredEventBlockSchema,
  quoteBlockSchema,
  sectionHeadingBlockSchema,
  eventGridBlockSchema,
  imageBlockSchema,
]);
export const backgroundSectionBlockSchema = base.extend({
  type: z.literal('backgroundSection'),
  background: z.enum(['neutral', 'blue']).default('neutral'),
  sectionHeader: sectionHeaderSchema.optional(),
  blocks: z.array(newsletterContentBlockSchema).min(1, t('validation.moduleRequired')),
});
export const newsletterBlockSchema = z.union([
  headerBlockSchema,
  newsletterContentBlockSchema,
  backgroundSectionBlockSchema,
  footerBlockSchema,
]);
export const newsletterDocumentSchema = z
  .object({
    schemaVersion: z.literal(CURRENT_NEWSLETTER_SCHEMA_VERSION),
    title: z.string().min(1),
    blocks: z.array(newsletterBlockSchema).min(2),
  })
  .strict()
  .superRefine((d, c) => {
    if (d.blocks[0]?.type !== 'header')
      c.addIssue({ code: 'custom', path: ['blocks', 0], message: t('validation.documentStartsWithHeader') });
    if (d.blocks.at(-1)?.type !== 'footer')
      c.addIssue({ code: 'custom', path: ['blocks'], message: t('validation.documentEndsWithFooter') });
  });
export type NewsletterDocument = z.infer<typeof newsletterDocumentSchema>;
export type NewsletterBlock = z.infer<typeof newsletterBlockSchema>;
export type NewsletterContentBlock = z.infer<typeof newsletterContentBlockSchema>;
export type HeaderBlock = z.infer<typeof headerBlockSchema>;
export type FooterBlock = z.infer<typeof footerBlockSchema>;
export type TextBlock = z.infer<typeof textBlockSchema>;
export type EventBlock = z.infer<typeof eventBlockSchema>;
export type FeaturedEventBlock = z.infer<typeof featuredEventBlockSchema>;
export type QuoteBlock = z.infer<typeof quoteBlockSchema>;
export type SectionHeadingBlock = z.infer<typeof sectionHeadingBlockSchema>;
export type EventGridBlock = z.infer<typeof eventGridBlockSchema>;
export type EventItem = z.infer<typeof eventItemSchema>;
export type ImageBlock = z.infer<typeof imageBlockSchema>;
export type BackgroundSectionBlock = z.infer<typeof backgroundSectionBlockSchema>;
export type NewsletterBlockPatch =
  | Partial<HeaderBlock>
  | Partial<TextBlock>
  | Partial<EventBlock>
  | Partial<FeaturedEventBlock>
  | Partial<QuoteBlock>
  | Partial<SectionHeadingBlock>
  | Partial<EventGridBlock>
  | Partial<ImageBlock>
  | Partial<BackgroundSectionBlock>
  | Partial<FooterBlock>;
export const isLocked = (b: NewsletterBlock) => b.type === 'header' || b.type === 'footer' || b.locked === true;

import { z } from 'zod';
import { CURRENT_NEWSLETTER_SCHEMA_VERSION } from './migrations/version';
export const allowedUrl = (v: string) => {
  try {
    const u = new URL(v);
    return ['https:', 'http:', 'mailto:'].includes(u.protocol);
  } catch {
    return false;
  }
};
const url = z.string().trim().refine(allowedUrl, 'Nur http, https oder mailto erlaubt');
const base = z.object({ id: z.string().min(1), locked: z.boolean().optional() });

export const allowedTextColors = ['#dc2626', '#6d7478', '#17303d', '#111827'] as const;
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
  | { type: 'heading'; attrs: z.infer<typeof headingAttrsSchema>; content?: TiptapNode[] }
  | { type: 'text'; text: string; marks?: TiptapMark[] }
  | { type: 'hardBreak' }
  | { type: 'bulletList'; content?: TiptapNode[] }
  | { type: 'orderedList'; content?: TiptapNode[] }
  | { type: 'listItem'; content?: TiptapNode[] };

const tiptapNodeSchema: z.ZodType<TiptapNode> = z.lazy(() =>
  z.union([
    z.object({ type: z.literal('paragraph'), content: z.array(tiptapNodeSchema).optional() }).strict(),
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
  decorative: z.boolean().default(false),
  href: url.optional().or(z.literal('')),
};
export const imageBlockSchema = base.extend({ type: z.literal('image'), ...imageFields }).superRefine((v, c) => {
  if ((v.src || v.assetId) && !v.decorative && !v.alt?.trim())
    c.addIssue({ code: 'custom', path: ['alt'], message: 'Alternativtext ist erforderlich.' });
});
export const eventItemSchema = z
  .object({
    id: z.string().min(1),
    image: z.object(imageFields).optional(),
    category: z.string().optional(),
    title: z.string().min(1, 'Titel ist erforderlich'),
    date: z.string().optional(),
    location: z.string().optional(),
    description: z.string().optional(),
    buttonLabel: z.string().optional(),
    buttonUrl: url.optional().or(z.literal('')),
  })
  .superRefine((v, c) => {
    if (v.buttonUrl && !v.buttonLabel?.trim())
      c.addIssue({ code: 'custom', path: ['buttonLabel'], message: 'Button-Label ist bei URL erforderlich.' });
    if (v.image?.src && !v.image.decorative && !v.image.alt?.trim())
      c.addIssue({ code: 'custom', path: ['image', 'alt'], message: 'Alternativtext ist erforderlich.' });
  });
export const eventBlockSchema = base
  .extend({
    type: z.literal('event'),
    image: z.object(imageFields).optional(),
    title: z.string().min(1, 'Titel ist erforderlich'),
    date: z.string().optional(),
    location: z.string().optional(),
    description: z.string().optional(),
    buttonLabel: z.string().optional(),
    buttonUrl: url.optional().or(z.literal('')),
  })
  .superRefine((v, c) => {
    if (v.buttonUrl && !v.buttonLabel?.trim())
      c.addIssue({ code: 'custom', path: ['buttonLabel'], message: 'Button-Label ist bei URL erforderlich.' });
    if (v.image?.src && !v.image.decorative && !v.image.alt?.trim())
      c.addIssue({ code: 'custom', path: ['image', 'alt'], message: 'Alternativtext ist erforderlich.' });
  });
export const featuredEventBlockSchema = base
  .extend({
    type: z.literal('featuredEvent'),
    overline: z.string().default('Featured Event'),
    background: z.enum(['blue', 'white']).default('blue'),
    image: z.object(imageFields).optional(),
    title: z.string().min(1, 'Titel ist erforderlich'),
    date: z.string().optional(),
    description: z.string().optional(),
    buttonLabel: z.string().optional(),
    buttonUrl: url.optional().or(z.literal('')),
  })
  .superRefine((v, c) => {
    if (v.buttonUrl && !v.buttonLabel?.trim())
      c.addIssue({ code: 'custom', path: ['buttonLabel'], message: 'Button-Label ist bei URL erforderlich.' });
    if (v.image?.src && !v.image.decorative && !v.image.alt?.trim())
      c.addIssue({ code: 'custom', path: ['image', 'alt'], message: 'Alternativtext ist erforderlich.' });
  });
export const quoteBlockSchema = base.extend({
  type: z.literal('quote'),
  quote: z.string().min(1, 'Zitat ist erforderlich'),
  author: z.string().optional(),
  role: z.string().optional(),
});
export const sectionHeadingBlockSchema = base.extend({
  type: z.literal('sectionHeading'),
  label: z.string().min(1, 'Abschnittsüberschrift ist erforderlich'),
});
export const eventGridBlockSchema = base.extend({
  type: z.literal('eventGrid'),
  heading: z.string().optional(),
  layout: z.enum(['grid', 'list']).default('grid'),
  items: z.array(eventItemSchema).min(1, 'Mindestens ein Event ist erforderlich'),
});
export const newsletterBlockSchema = z.union([
  headerBlockSchema,
  textBlockSchema,
  eventBlockSchema,
  featuredEventBlockSchema,
  quoteBlockSchema,
  sectionHeadingBlockSchema,
  eventGridBlockSchema,
  imageBlockSchema,
  footerBlockSchema,
]);
export const newsletterDocumentSchema = z
  .object({
    schemaVersion: z.literal(CURRENT_NEWSLETTER_SCHEMA_VERSION),
    title: z.string().min(1),
    blocks: z.array(newsletterBlockSchema).min(2),
  })
  .superRefine((d, c) => {
    if (d.blocks[0]?.type !== 'header')
      c.addIssue({ code: 'custom', path: ['blocks', 0], message: 'Dokument muss mit Header beginnen' });
    if (d.blocks.at(-1)?.type !== 'footer')
      c.addIssue({ code: 'custom', path: ['blocks'], message: 'Dokument muss mit Footer enden' });
  });
export type NewsletterDocument = z.infer<typeof newsletterDocumentSchema>;
export type NewsletterBlock = z.infer<typeof newsletterBlockSchema>;
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
export type NewsletterBlockPatch =
  | Partial<HeaderBlock>
  | Partial<TextBlock>
  | Partial<EventBlock>
  | Partial<FeaturedEventBlock>
  | Partial<QuoteBlock>
  | Partial<SectionHeadingBlock>
  | Partial<EventGridBlock>
  | Partial<ImageBlock>
  | Partial<FooterBlock>;
export const isLocked = (b: NewsletterBlock) => b.type === 'header' || b.type === 'footer' || b.locked === true;

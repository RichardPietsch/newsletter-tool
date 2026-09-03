import { z } from 'zod';

const optionalUrl = z
  .string()
  .trim()
  .max(2048)
  .refine(
    (value) => {
      if (!value) return true;
      try {
        return ['http:', 'https:', 'mailto:'].includes(new URL(value).protocol);
      } catch {
        return false;
      }
    },
    { message: 'Nur http, https oder mailto erlaubt' },
  )
  .optional()
  .or(z.literal(''));

export const eventImageSchema = z
  .object({
    assetId: z.string().optional(),
    src: optionalUrl,
    alt: z.string().max(300).optional(),
    decorative: z.boolean().default(false),
  })
  .optional();

export const eventInputSchema = z
  .object({
    category: z.string().trim().max(120).optional(),
    title: z.string().trim().min(1).max(240),
    speakerName: z.string().trim().max(160).optional(),
    speakerRole: z.string().trim().max(240).optional(),
    date: z.string().trim().max(160).optional(),
    location: z.string().trim().max(240).optional(),
    description: z.string().trim().max(2000).optional(),
    buttonLabel: z.string().trim().max(120).optional(),
    buttonUrl: optionalUrl,
    image: eventImageSchema,
  })
  .superRefine((value, context) => {
    if (value.buttonUrl && !value.buttonLabel) {
      context.addIssue({ code: 'custom', path: ['buttonLabel'], message: 'Button-Label ist bei URL erforderlich.' });
    }
    if (value.image?.src && !value.image.decorative && !value.image.alt?.trim()) {
      context.addIssue({ code: 'custom', path: ['image', 'alt'], message: 'Alternativtext ist erforderlich.' });
    }
  });

export const eventUpdateSchema = eventInputSchema.and(z.object({ id: z.string().min(1) }));
export const eventDeleteSchema = z.object({ id: z.string().min(1) });

export type EventInput = z.infer<typeof eventInputSchema>;
export type EventImage = z.infer<typeof eventImageSchema>;
export type EventRecord = EventInput & {
  id: string;
  tenantId: string;
  createdAt: string | Date;
  updatedAt: string | Date;
};

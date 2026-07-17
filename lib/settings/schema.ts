import { z } from 'zod';
import { tiptapDocSchema } from '@/lib/newsletter/schema';

export const headerVariantSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  imageUrl: z.string().url(),
  alt: z.string().min(1),
});

export const globalSettingsSchema = z.object({
  headerVariants: z.array(headerVariantSchema).default([]),
  footerRichText: tiptapDocSchema,
});

export type GlobalSettings = z.infer<typeof globalSettingsSchema>;
export type HeaderVariant = z.infer<typeof headerVariantSchema>;

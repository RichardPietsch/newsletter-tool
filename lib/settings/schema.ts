import { z } from 'zod';
import { tiptapDocSchema } from '@/lib/newsletter/schema';
import { newsletterThemePalettes } from '@/lib/newsletter/module-styles';

const colorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Farbe muss als sechsstelliger Hex-Wert angegeben werden.');

const newsletterThemePaletteShape = {
  background: colorSchema,
  surface: colorSchema,
  teaser: colorSchema,
  text: colorSchema,
  muted: colorSchema,
  accent: colorSchema,
  brand: colorSchema,
  featureBackground: colorSchema,
};

export const newsletterColorPaletteSchema = z.object(newsletterThemePaletteShape);
export const strictNewsletterColorPaletteSchema = z.object(newsletterThemePaletteShape).strict();

export const newsletterDesignColorsSchema = z
  .object({
    light: newsletterColorPaletteSchema,
    dark: newsletterColorPaletteSchema,
  })
  .default({
    light: { ...newsletterThemePalettes.light },
    dark: { ...newsletterThemePalettes.dark },
  });

export const headerVariantSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  imageUrl: z.string().url(),
  alt: z.string().min(1),
});

export const globalSettingsSchema = z.object({
  headerVariants: z.array(headerVariantSchema).default([]),
  footerRichText: tiptapDocSchema,
  colors: newsletterDesignColorsSchema,
});

export type GlobalSettings = z.infer<typeof globalSettingsSchema>;
export type GlobalSettingsInput = z.input<typeof globalSettingsSchema>;
export type HeaderVariant = z.infer<typeof headerVariantSchema>;
export type NewsletterDesignColors = z.infer<typeof newsletterDesignColorsSchema>;

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

const newsletterDesignColorsObjectSchema = z.object({
  light: newsletterColorPaletteSchema,
  dark: newsletterColorPaletteSchema,
});

export const newsletterDesignColorsSchema = newsletterDesignColorsObjectSchema.default({
  light: { ...newsletterThemePalettes.light },
  dark: { ...newsletterThemePalettes.dark },
});

export const ROUNDED_HEADER_IMAGE_RADIUS_PX = 8;

export const headerVariantSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  imageUrl: z.string().url(),
  alt: z.string().min(1),
  roundedCorners: z.boolean().default(false),
});

const persistedHeaderVariantSchema = headerVariantSchema.extend({ roundedCorners: z.boolean() });

export const globalSettingsSchema = z.object({
  headerVariants: z.array(headerVariantSchema).default([]),
  footerRichText: tiptapDocSchema,
  colors: newsletterDesignColorsSchema,
});

export const CURRENT_TENANT_SETTINGS_SCHEMA_VERSION = 2 as const;

export const persistedGlobalSettingsSchema = z
  .object({
    schemaVersion: z.literal(CURRENT_TENANT_SETTINGS_SCHEMA_VERSION),
    headerVariants: z.array(persistedHeaderVariantSchema),
    footerRichText: tiptapDocSchema,
    colors: newsletterDesignColorsObjectSchema,
  })
  .strict();

export type GlobalSettings = z.infer<typeof globalSettingsSchema>;
export type GlobalSettingsInput = z.input<typeof globalSettingsSchema>;
export type PersistedGlobalSettings = z.infer<typeof persistedGlobalSettingsSchema>;
export type HeaderVariant = z.infer<typeof headerVariantSchema>;
export type NewsletterDesignColors = z.infer<typeof newsletterDesignColorsSchema>;

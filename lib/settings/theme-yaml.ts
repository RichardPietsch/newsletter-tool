import { parse, stringify } from 'yaml';
import { z } from 'zod';
import { strictNewsletterColorPaletteSchema, type NewsletterDesignColors } from './schema';

export const THEME_YAML_MAX_BYTES = 64 * 1024;

const themeYamlSchema = z
  .object({
    version: z.literal(1),
    light: strictNewsletterColorPaletteSchema,
    dark: strictNewsletterColorPaletteSchema,
  })
  .strict();

export type ThemeYamlDocument = z.infer<typeof themeYamlSchema>;

export function serializeThemeYaml(colors: NewsletterDesignColors) {
  return stringify(
    {
      version: 1,
      light: colors.light,
      dark: colors.dark,
    } satisfies ThemeYamlDocument,
    { indent: 2, lineWidth: 0 },
  );
}

export function parseThemeYaml(source: string): NewsletterDesignColors {
  if (new TextEncoder().encode(source).byteLength > THEME_YAML_MAX_BYTES) {
    throw new Error('Theme-Datei ist zu groß.');
  }

  const parsed = themeYamlSchema.parse(parse(source));
  return { light: parsed.light, dark: parsed.dark };
}

import { newsletterColorPalettes } from '@/lib/newsletter/module-styles';

export const emailTheme = {
  container: 600,
  font: 'Arial, Helvetica, sans-serif',
  colors: newsletterColorPalettes.light,
  space: { sm: 12, md: 20, lg: 32 },
} as const;

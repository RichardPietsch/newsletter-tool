export type NewsletterPreviewMode = 'light' | 'dark';

export const newsletterThemeColorTokens = [
  'background',
  'surface',
  'teaser',
  'text',
  'muted',
  'accent',
  'brand',
  'featureBackground',
] as const;

export type NewsletterThemeColorToken = (typeof newsletterThemeColorTokens)[number];
export type NewsletterThemePalette = Record<NewsletterThemeColorToken, string>;

export const newsletterThemePalettes = {
  light: {
    background: '#f4f1ec',
    surface: '#ffffff',
    teaser: '#dae1e2',
    text: '#17303d',
    muted: '#6d7478',
    accent: '#a63a3a',
    brand: '#1d4ed8',
    featureBackground: '#17303d',
  },
  dark: {
    background: '#10191e',
    surface: '#1d2a31',
    teaser: '#293b43',
    text: '#f5f1eb',
    muted: '#b9c5ca',
    accent: '#e28b83',
    brand: '#91afff',
    featureBackground: '#234653',
  },
} as const satisfies Record<NewsletterPreviewMode, NewsletterThemePalette>;

type Rgb = { red: number; green: number; blue: number };

function hexToRgb(color: string): Rgb {
  const value = color.replace('#', '');
  return {
    red: Number.parseInt(value.slice(0, 2), 16),
    green: Number.parseInt(value.slice(2, 4), 16),
    blue: Number.parseInt(value.slice(4, 6), 16),
  };
}

function rgbToHex({ red, green, blue }: Rgb) {
  const channel = (value: number) => Math.round(value).toString(16).padStart(2, '0');
  return `#${channel(red)}${channel(green)}${channel(blue)}`;
}

function mixColors(foreground: string, background: string, foregroundWeight: number) {
  const first = hexToRgb(foreground);
  const second = hexToRgb(background);
  const mix = (foregroundChannel: number, backgroundChannel: number) =>
    foregroundChannel * foregroundWeight + backgroundChannel * (1 - foregroundWeight);
  return rgbToHex({
    red: mix(first.red, second.red),
    green: mix(first.green, second.green),
    blue: mix(first.blue, second.blue),
  });
}

function relativeLuminance(color: string) {
  const { red, green, blue } = hexToRgb(color);
  const linearize = (channel: number) => {
    const normalized = channel / 255;
    return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * linearize(red) + 0.7152 * linearize(green) + 0.0722 * linearize(blue);
}

export function newsletterContrastRatio(first: string, second: string) {
  const lighter = Math.max(relativeLuminance(first), relativeLuminance(second));
  const darker = Math.min(relativeLuminance(first), relativeLuminance(second));
  return (lighter + 0.05) / (darker + 0.05);
}

function readableColor(background: string, preferred: string[]) {
  const preferredWithContrast = preferred
    .map((color) => ({ color, contrast: newsletterContrastRatio(color, background) }))
    .sort((first, second) => second.contrast - first.contrast);
  if (preferredWithContrast[0]?.contrast >= 4.5) return preferredWithContrast[0].color;

  return ['#000000', '#ffffff']
    .map((color) => ({ color, contrast: newsletterContrastRatio(color, background) }))
    .sort((first, second) => second.contrast - first.contrast)[0].color;
}

function mixedTextColor(foreground: string, background: string, initialWeight: number) {
  for (let weight = initialWeight; weight <= 1; weight += 0.02) {
    const candidate = mixColors(foreground, background, Math.min(weight, 1));
    if (newsletterContrastRatio(candidate, background) >= 4.5) return candidate;
  }
  return foreground;
}

export type NewsletterColorPalette = NewsletterThemePalette & {
  featureText: string;
  featureMuted: string;
  featureAccent: string;
  featureButtonBackground: string;
  featureButtonText: string;
  brandText: string;
};

export function deriveNewsletterColorPalette(base: NewsletterThemePalette): NewsletterColorPalette {
  const featureText = readableColor(base.featureBackground, [base.surface, base.text]);
  const featureMuted = mixedTextColor(featureText, base.featureBackground, 0.84);
  const mixedFeatureAccent = mixedTextColor(featureText, base.featureBackground, 0.78);
  const featureAccent =
    newsletterContrastRatio(base.accent, base.featureBackground) >= 4.5 ? base.accent : mixedFeatureAccent;
  const featureButtonBackground = mixColors(featureText, base.featureBackground, 0.86);

  return {
    ...base,
    featureText,
    featureMuted,
    featureAccent,
    featureButtonBackground,
    featureButtonText: readableColor(featureButtonBackground, [base.featureBackground, base.text, base.surface]),
    brandText: readableColor(base.brand, [base.surface, base.text]),
  };
}

export const newsletterColorPalettes = {
  light: deriveNewsletterColorPalette(newsletterThemePalettes.light),
  dark: deriveNewsletterColorPalette(newsletterThemePalettes.dark),
} satisfies Record<NewsletterPreviewMode, NewsletterColorPalette>;

export type NewsletterColorToken = keyof NewsletterColorPalette;
export type NewsletterDesignPalettes = Record<NewsletterPreviewMode, NewsletterThemePalette>;

export const newsletterEditableTextColors = [
  newsletterColorPalettes.light.muted,
  newsletterColorPalettes.light.accent,
] as const;
export const newsletterLegacyTextColors = ['#dc2626', '#111827', '#ffffff'] as const;

const colorTokens = Object.keys(newsletterColorPalettes.light) as NewsletterColorToken[];
const cssVariableName = (token: NewsletterColorToken) =>
  `--newsletter-${token.replace(/[A-Z]/g, (character) => `-${character.toLowerCase()}`)}`;

export const newsletterColorVariables = Object.fromEntries(
  colorTokens.map((token) => [token, `var(${cssVariableName(token)})`]),
) as Record<NewsletterColorToken, string>;

export const newsletterPreviewCssVariables = Object.fromEntries(
  (Object.keys(newsletterColorPalettes) as NewsletterPreviewMode[]).map((mode) => [
    mode,
    Object.fromEntries(colorTokens.map((token) => [cssVariableName(token), newsletterColorPalettes[mode][token]])),
  ]),
) as Record<NewsletterPreviewMode, Record<string, string>>;

export function createNewsletterPreviewCssVariables(palette: NewsletterColorPalette) {
  return Object.fromEntries(colorTokens.map((token) => [cssVariableName(token), palette[token]])) as Record<
    string,
    string
  >;
}

export const newsletterEmailClasses = {
  background: 'newsletter-background',
  surface: 'newsletter-surface',
  teaser: 'newsletter-teaser',
  text: 'newsletter-text',
  muted: 'newsletter-muted',
  accent: 'newsletter-accent',
  brand: 'newsletter-brand',
  featureBackground: 'newsletter-feature-background',
  featureText: 'newsletter-feature-text',
  featureMuted: 'newsletter-feature-muted',
  featureAccent: 'newsletter-feature-accent',
  featureButton: 'newsletter-feature-button',
  brandButton: 'newsletter-brand-button',
  solidButton: 'newsletter-solid-button',
  outlineButton: 'newsletter-outline-button',
  accentBorder: 'newsletter-accent-border',
  rounded: 'newsletter-rounded',
  roundedTop: 'newsletter-rounded-top',
  roundedBottom: 'newsletter-rounded-bottom',
} as const;

const backgroundRule = (className: string, color: string) =>
  `.${className}, .${className} > table { background:${color} !important; background-color:${color} !important; }`;
const textRule = (className: string, color: string) =>
  `.${className}, .${className} > div { color:${color} !important; }`;
const radiusRule = (className: string, radius: string) =>
  `.${className}, .${className} > table { border-radius:${radius} !important; overflow:hidden !important; }`;

function darkModeRules(prefix = '', colors: NewsletterColorPalette = newsletterColorPalettes.dark) {
  const classes = newsletterEmailClasses;
  const rules = [
    backgroundRule(classes.background, colors.background),
    backgroundRule(classes.surface, colors.surface),
    backgroundRule(classes.teaser, colors.teaser),
    backgroundRule(classes.featureBackground, colors.featureBackground),
    textRule(classes.text, colors.text),
    textRule(classes.muted, colors.muted),
    textRule(classes.accent, colors.accent),
    textRule(classes.brand, colors.brand),
    textRule(classes.featureText, colors.featureText),
    textRule(classes.featureMuted, colors.featureMuted),
    textRule(classes.featureAccent, colors.featureAccent),
    `.${classes.featureButton} td, .${classes.featureButton} a { background:${colors.featureButtonBackground} !important; background-color:${colors.featureButtonBackground} !important; color:${colors.featureButtonText} !important; }`,
    `.${classes.brandButton} td, .${classes.brandButton} a { background:${colors.brand} !important; background-color:${colors.brand} !important; color:${colors.brandText} !important; }`,
    `.${classes.solidButton} td, .${classes.solidButton} a { background:${colors.featureBackground} !important; background-color:${colors.featureBackground} !important; color:${colors.featureText} !important; }`,
    `.${classes.outlineButton} td, .${classes.outlineButton} a { background:${colors.teaser} !important; background-color:${colors.teaser} !important; border-color:${colors.text} !important; color:${colors.text} !important; }`,
    `.${classes.muted} a { color:${colors.muted} !important; }`,
    `.${classes.accentBorder}, .${classes.accentBorder} > table { border-color:${colors.accent} !important; }`,
    radiusRule(classes.rounded, '4px'),
    radiusRule(classes.roundedTop, '4px 4px 0 0'),
    radiusRule(classes.roundedBottom, '0 0 4px 4px'),
  ];

  const bodyRule = `${prefix || 'body'}, ${prefix ? `${prefix} > div` : 'body > div'} { background:${colors.background} !important; background-color:${colors.background} !important; }`;
  if (!prefix) return [bodyRule, ...rules].join('\n');
  return [
    bodyRule,
    ...rules.map((rule) =>
      rule.replace(
        /^([^{}]+){/,
        (_match, selectors: string) =>
          `${selectors
            .split(',')
            .map((selector) => `${prefix} ${selector.trim()}`)
            .join(', ')} {`,
      ),
    ),
  ].join('\n');
}

export function createNewsletterEmailDarkModeCss(colors: NewsletterColorPalette) {
  return `:root { color-scheme: light dark; supported-color-schemes: light dark; }
@media (prefers-color-scheme: dark) {
${darkModeRules('', colors)}
}
${darkModeRules('[data-ogsc]', colors)}`;
}

export const newsletterEmailDarkModeCss = createNewsletterEmailDarkModeCss(newsletterColorPalettes.dark);

export const newsletterModuleStyles = {
  colors: newsletterColorPalettes.light,
  colorVariables: newsletterColorVariables,
  eventGrid: {
    outerPaddingX: 24,
    outerPaddingY: 20,
    gap: 24,
    cardPadding: 24,
    imageHeight: 160,
    overlineTop: 18,
    titleTop: 8,
    metaTop: 10,
    descriptionTop: 10,
    ctaTop: 18,
    ctaBottom: 24,
  },
} as const;

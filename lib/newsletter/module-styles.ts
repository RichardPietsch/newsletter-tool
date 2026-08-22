export type NewsletterPreviewMode = 'light' | 'dark';

export const newsletterColorPalettes = {
  light: {
    background: '#f4f1ec',
    surface: '#ffffff',
    teaser: '#dae1e2',
    text: '#17303d',
    muted: '#6d7478',
    accent: '#a63a3a',
    brand: '#1d4ed8',
    border: '#d7dee8',
    featureBackground: '#17303d',
    featureText: '#ffffff',
    featureMuted: '#dbe5e9',
    featureAccent: '#cddde3',
    featureButtonBackground: '#dbe7eb',
    featureButtonText: '#17303d',
  },
  dark: {
    background: '#10191e',
    surface: '#1d2a31',
    teaser: '#293b43',
    text: '#f5f1eb',
    muted: '#b9c5ca',
    accent: '#e28b83',
    brand: '#91afff',
    border: '#43565f',
    featureBackground: '#234653',
    featureText: '#f7fafb',
    featureMuted: '#d0dfe4',
    featureAccent: '#bcd5df',
    featureButtonBackground: '#dbe7eb',
    featureButtonText: '#17303d',
  },
} as const;

export type NewsletterColorToken = keyof (typeof newsletterColorPalettes)['light'];

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
} as const;

const backgroundRule = (className: string, color: string) =>
  `.${className}, .${className} > table { background:${color} !important; background-color:${color} !important; }`;
const textRule = (className: string, color: string) =>
  `.${className}, .${className} > div { color:${color} !important; }`;

function darkModeRules(prefix = '') {
  const colors = newsletterColorPalettes.dark;
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
    `.${classes.brandButton} td, .${classes.brandButton} a { background:${colors.brand} !important; background-color:${colors.brand} !important; color:${colors.featureText} !important; }`,
    `.${classes.solidButton} td, .${classes.solidButton} a { background:${colors.featureBackground} !important; background-color:${colors.featureBackground} !important; color:${colors.featureText} !important; }`,
    `.${classes.outlineButton} td, .${classes.outlineButton} a { background:${colors.teaser} !important; background-color:${colors.teaser} !important; border-color:${colors.text} !important; color:${colors.text} !important; }`,
    `.${classes.muted} a { color:${colors.muted} !important; }`,
    `.${classes.accentBorder}, .${classes.accentBorder} > table { border-color:${colors.accent} !important; }`,
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

export const newsletterEmailDarkModeCss = `:root { color-scheme: light dark; supported-color-schemes: light dark; }
@media (prefers-color-scheme: dark) {
${darkModeRules()}
}
${darkModeRules('[data-ogsc]')}`;

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

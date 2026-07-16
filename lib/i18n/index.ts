import { de } from './locales/de';

export const dictionaries = { de } as const;
export type Locale = keyof typeof dictionaries;
export const defaultLocale: Locale = 'de';

type Join<K, P> = K extends string ? P extends string ? `${K}.${P}` : never : never;
type Prev = [never, 0, 1, 2, 3, 4, 5];
type Leaves<T, D extends number = 5> = [D] extends [never] ? never : T extends string ? never : {
  [K in keyof T & string]: T[K] extends string ? K : Join<K, Leaves<T[K], Prev[D]>>
}[keyof T & string];

export type UiTextKey = Leaves<typeof de>;

function lookup(path: string, locale: Locale = defaultLocale) {
  return path.split('.').reduce<unknown>((current, segment) => (current as Record<string, unknown>)?.[segment], dictionaries[locale]) as string;
}

export function t(key: UiTextKey, locale: Locale = defaultLocale) {
  return lookup(key, locale);
}

export function flattenUiText(value: unknown = de): string[] {
  if (typeof value === 'string') return [value];
  if (!value || typeof value !== 'object') return [];
  return Object.values(value).flatMap((entry) => flattenUiText(entry));
}

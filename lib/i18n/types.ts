import type { de } from './locales/de';

type StringDictionary<T> = {
  readonly [Key in keyof T]: T[Key] extends string ? string : StringDictionary<T[Key]>;
};

export type UiDictionary = StringDictionary<typeof de>;

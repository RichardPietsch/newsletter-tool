function collectKeys(value: unknown, prefix = ''): string[] {
  if (!value || typeof value !== 'object') return prefix ? [prefix] : [];
  return Object.entries(value).flatMap(([key, entry]) => collectKeys(entry, prefix ? `${prefix}.${key}` : key));
}

export function compareLocaleKeys(reference: unknown, candidate: unknown) {
  const referenceKeys = new Set(collectKeys(reference));
  const candidateKeys = new Set(collectKeys(candidate));
  return {
    missing: [...referenceKeys].filter((key) => !candidateKeys.has(key)).sort(),
    extra: [...candidateKeys].filter((key) => !referenceKeys.has(key)).sort(),
  };
}

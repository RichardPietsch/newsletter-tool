type ApiErrorPayload = {
  error?: string | { message?: string; issues?: unknown[] };
  issues?: unknown[];
};

export function getApiErrorMessage(payload: ApiErrorPayload | null | undefined, fallback: string) {
  if (typeof payload?.error === 'string') return payload.error;
  if (payload?.error?.message) return payload.error.message;
  return fallback;
}

export function getApiErrorIssues<TIssue>(payload: ApiErrorPayload | null | undefined) {
  if (Array.isArray(payload?.error) || !payload) return [];
  const nestedIssues = typeof payload.error === 'object' && Array.isArray(payload.error.issues) ? payload.error.issues : undefined;
  return (nestedIssues ?? payload.issues ?? []) as TIssue[];
}

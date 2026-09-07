import type { NextResponse } from 'next/server';
import type { z, ZodTypeAny } from 'zod';
import { badRequest, validationError, zodIssues } from './api-error';
import { t } from '@/lib/i18n';

export type ParsedJson<T> = { data: T; response: null } | { data: null; response: NextResponse };

export async function parseJson<TSchema extends ZodTypeAny>(
  request: Request,
  schema: TSchema,
): Promise<ParsedJson<z.infer<TSchema>>> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return { data: null, response: badRequest(t('api.invalidJson')) };
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return { data: null, response: validationError(t('api.invalidInput'), zodIssues(parsed.error.issues)) };
  }

  return { data: parsed.data, response: null };
}

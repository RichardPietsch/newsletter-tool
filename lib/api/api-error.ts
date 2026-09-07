import { NextResponse } from 'next/server';
import type { ZodIssue } from 'zod';
import { t } from '@/lib/i18n';

export type ApiErrorCode =
  'BAD_REQUEST' | 'CONFLICT' | 'FORBIDDEN' | 'NOT_FOUND' | 'UNAUTHENTICATED' | 'VALIDATION_ERROR';

export type ApiErrorIssue = {
  code?: string;
  message?: string;
  path?: Array<number | string> | string;
} & Record<string, unknown>;

export type ApiErrorBody = {
  error: {
    code: ApiErrorCode;
    message: string;
    issues?: ApiErrorIssue[];
  };
};

export function zodIssues(issues: ZodIssue[]): ApiErrorIssue[] {
  return issues.map((issue) => ({
    code: issue.code,
    message: issue.message,
    path: issue.path,
  }));
}

export function apiError(status: number, code: ApiErrorCode, message: string, issues?: ApiErrorIssue[]) {
  const body: ApiErrorBody = { error: { code, message } };
  if (issues) body.error.issues = issues;
  return NextResponse.json(body, { status });
}

export function badRequest(message = t('api.badRequest')) {
  return apiError(400, 'BAD_REQUEST', message);
}

export function conflict(message = t('api.conflict')) {
  return apiError(409, 'CONFLICT', message);
}

export function forbidden(message = t('api.forbidden')) {
  return apiError(403, 'FORBIDDEN', message);
}

export function notFound(message = t('api.notFound')) {
  return apiError(404, 'NOT_FOUND', message);
}

export function unauthenticated(message = t('api.unauthenticated')) {
  return apiError(401, 'UNAUTHENTICATED', message);
}

export function validationError(message = t('api.invalidInput'), issues: ApiErrorIssue[] = []) {
  return apiError(400, 'VALIDATION_ERROR', message, issues);
}

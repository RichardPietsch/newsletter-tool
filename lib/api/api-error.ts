import { NextResponse } from 'next/server';
import type { ZodIssue } from 'zod';

export type ApiErrorCode =
  | 'BAD_REQUEST'
  | 'CONFLICT'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'UNAUTHENTICATED'
  | 'VALIDATION_ERROR';

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

export function badRequest(message = 'Ungültige Anfrage.') {
  return apiError(400, 'BAD_REQUEST', message);
}

export function conflict(message: string) {
  return apiError(409, 'CONFLICT', message);
}

export function forbidden(message: string) {
  return apiError(403, 'FORBIDDEN', message);
}

export function notFound(message = 'Nicht gefunden') {
  return apiError(404, 'NOT_FOUND', message);
}

export function unauthenticated(message = 'Nicht authentifiziert') {
  return apiError(401, 'UNAUTHENTICATED', message);
}

export function validationError(message = 'Ungültige Eingaben.', issues: ApiErrorIssue[] = []) {
  return apiError(400, 'VALIDATION_ERROR', message, issues);
}

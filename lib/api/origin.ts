import type { NextResponse } from 'next/server';
import { forbidden } from './api-error';
import { serverEnv } from '@/lib/env';

type OriginEnv = Pick<typeof serverEnv, 'appUrl' | 'isProduction'>;

function originFromUrl(value: string) {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function loopbackOriginsFor(origin: string) {
  const url = new URL(origin);
  if (!['localhost', '127.0.0.1', '0.0.0.0'].includes(url.hostname)) return [];
  return ['localhost', '127.0.0.1', '0.0.0.0'].map((hostname) => `${url.protocol}//${hostname}${url.port ? `:${url.port}` : ''}`);
}

function allowedOrigins(request: Request, env: OriginEnv) {
  const configuredOrigin = originFromUrl(env.appUrl);
  const requestOrigin = env.isProduction ? null : originFromUrl(request.url);
  const origins = [configuredOrigin, requestOrigin].filter((origin): origin is string => Boolean(origin));
  const devLoopbackOrigins = env.isProduction ? [] : origins.flatMap(loopbackOriginsFor);
  return new Set([...origins, ...devLoopbackOrigins]);
}

function requestSourceOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if (origin) return originFromUrl(origin);

  const referer = request.headers.get('referer');
  if (referer) return originFromUrl(referer);

  return null;
}

export function validateMutationOrigin(request: Request, env: OriginEnv = serverEnv): NextResponse | null {
  const sourceOrigin = requestSourceOrigin(request);
  if (!sourceOrigin) {
    return env.isProduction ? forbidden('Anfrage wurde wegen fehlender Herkunft blockiert.') : null;
  }

  return allowedOrigins(request, env).has(sourceOrigin)
    ? null
    : forbidden('Anfrage wurde wegen ungültiger Herkunft blockiert.');
}

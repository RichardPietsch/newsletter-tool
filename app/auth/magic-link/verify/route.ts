export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { validateMutationOrigin } from '@/lib/api/origin';
import { AUTH_COOKIE_NAME, sessionCookieOptions } from '@/lib/auth/cookies';
import { verifyMagicLink } from '@/lib/auth/magic-link';
import { clientIpFrom } from '@/lib/auth/rate-limit';
import { logger, requestIdFrom } from '@/lib/logging/logger';
import { blockSupportMutationIfActive } from '@/lib/auth/current-user';

export async function GET(request: Request) {
  const url = new URL('/auth/magic-link/confirm', request.url);
  const token = new URL(request.url).searchParams.get('token');
  if (token) url.searchParams.set('token', token);
  return NextResponse.redirect(url, 303);
}

export async function POST(request: Request) {
  const requestId = requestIdFrom(request);
  const supportError = await blockSupportMutationIfActive(request);
  if (supportError) return supportError;
  const originError = validateMutationOrigin(request);
  if (originError) return originError;
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.redirect(new URL('/login?error=invalid-or-expired', request.url), 303);
  }
  const token = form.get('token');
  if (typeof token !== 'string' || token.length < 32 || token.length > 256) {
    logger.warn({ event: 'auth.magic_link.verify_rejected', requestId }, { reason: 'missing_token' });
    return NextResponse.redirect(new URL('/login?error=invalid-or-expired', request.url), 303);
  }
  const result = await verifyMagicLink(token, {
    userAgent: request.headers.get('user-agent'),
    ip: clientIpFrom(request),
    correlationId: requestId,
  });
  if (!result) {
    logger.warn({ event: 'auth.magic_link.verify_rejected', requestId }, { reason: 'invalid_or_expired' });
    return NextResponse.redirect(new URL('/login?error=invalid-or-expired', request.url), 303);
  }
  logger.info({
    event: 'auth.magic_link.verified',
    requestId,
    userId: result.user.id,
    tenantId: result.user.tenantId ?? undefined,
  });
  const destination = result.user.role === 'platform_admin' ? '/admin' : '/newsletters';
  const response = NextResponse.redirect(new URL(destination, request.url), 303);
  response.cookies.set(AUTH_COOKIE_NAME, result.sessionToken, sessionCookieOptions());
  response.headers.set('cache-control', 'no-store');
  response.headers.set('referrer-policy', 'no-referrer');
  return response;
}

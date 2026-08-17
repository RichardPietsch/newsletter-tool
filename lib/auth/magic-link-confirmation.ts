import { createHmac, timingSafeEqual } from 'crypto';
import type { ResponseCookie } from 'next/dist/compiled/@edge-runtime/cookies';
import { serverEnv } from '@/lib/env';
import { MAGIC_LINK_TTL_MINUTES } from './config';

export const MAGIC_LINK_CONFIRMATION_COOKIE = 'newsletter_magic_link_confirmation';

export function createMagicLinkConfirmationProof(token: string, secret = serverEnv.auth.rateLimitSecret) {
  return createHmac('sha256', secret).update(token).digest('base64url');
}

function cookieValue(request: Request, name: string) {
  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(';')) {
    const separator = part.indexOf('=');
    if (separator < 0 || part.slice(0, separator).trim() !== name) continue;
    return part.slice(separator + 1).trim();
  }
  return null;
}

export function hasValidMagicLinkConfirmationProof(
  request: Request,
  token: string,
  secret = serverEnv.auth.rateLimitSecret,
) {
  const actual = cookieValue(request, MAGIC_LINK_CONFIRMATION_COOKIE);
  if (!actual) return false;
  const expected = createMagicLinkConfirmationProof(token, secret);
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}

export function mayUseMagicLinkConfirmationProof(request: Request) {
  const origin = request.headers.get('origin');
  return (origin === null || origin === 'null') && !request.headers.get('referer');
}

export function magicLinkConfirmationCookieOptions(): Partial<ResponseCookie> {
  return {
    httpOnly: true,
    secure: serverEnv.isProduction,
    sameSite: 'lax',
    path: '/auth/magic-link/verify',
    maxAge: 60 * MAGIC_LINK_TTL_MINUTES,
  };
}

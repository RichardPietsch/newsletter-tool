import type { ResponseCookie } from 'next/dist/compiled/@edge-runtime/cookies';
import { serverEnv } from '@/lib/env';
import { AUTH_COOKIE_NAME, SESSION_DAYS } from './config';

export function sessionCookieOptions(): Partial<ResponseCookie> {
  return {
    httpOnly: true,
    secure: serverEnv.isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * SESSION_DAYS,
  };
}

export { AUTH_COOKIE_NAME };

export const dynamic = 'force-dynamic';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { AUTH_COOKIE_NAME, sessionCookieOptions } from '@/lib/auth/cookies';
import { verifyMagicLink } from '@/lib/auth/magic-link';
import { logger, requestIdFrom } from '@/lib/logging/logger';
export async function GET(request: Request) {
  const requestId = requestIdFrom(request);
  const url = new URL(request.url);
  const token = url.searchParams.get('token');
  if (!token) {
    logger.warn({ event: 'auth.magic_link.verify_rejected', requestId }, { reason: 'missing_token' });
    redirect('/login?error=invalid-or-expired');
  }
  const result = await verifyMagicLink(token, {
    userAgent: request.headers.get('user-agent'),
    ip: request.headers.get('x-forwarded-for'),
  });
  if (!result) {
    logger.warn({ event: 'auth.magic_link.verify_rejected', requestId }, { reason: 'invalid_or_expired' });
    redirect('/login?error=invalid-or-expired');
  }
  logger.info({ event: 'auth.magic_link.verified', requestId, userId: result.user.id });
  const jar = await cookies();
  jar.set(AUTH_COOKIE_NAME, result.sessionToken, sessionCookieOptions());
  redirect('/newsletters');
}

import { createHmac } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from '@/lib/db';
import { authRateLimits } from '@/lib/db/schema';
import { serverEnv } from '@/lib/env';

type RateLimitScope = 'magic_link_email' | 'magic_link_ip' | 'magic_link_verify_ip';

function keyHash(value: string) {
  return createHmac('sha256', serverEnv.auth.rateLimitSecret).update(value).digest('hex');
}

export function clientIpFrom(request: Request) {
  const forwarded = request.headers.get('x-forwarded-for');
  const closest = forwarded?.split(',').at(-1)?.trim();
  return (closest || request.headers.get('x-real-ip') || 'unknown').slice(0, 64);
}

export async function takeRateLimit(
  scope: RateLimitScope,
  key: string,
  maximum: number,
  windowMs = 15 * 60 * 1000,
) {
  const now = Date.now();
  const windowStartedAt = new Date(Math.floor(now / windowMs) * windowMs);
  const expiresAt = new Date(windowStartedAt.getTime() + windowMs * 2);
  const [row] = await db
    .insert(authRateLimits)
    .values({ id: nanoid(), scope, keyHash: keyHash(key), windowStartedAt, expiresAt })
    .onConflictDoUpdate({
      target: [authRateLimits.scope, authRateLimits.keyHash, authRateLimits.windowStartedAt],
      set: { count: sql`${authRateLimits.count} + 1`, updatedAt: new Date(), expiresAt },
    })
    .returning({ count: authRateLimits.count });
  return (row?.count ?? maximum + 1) <= maximum;
}

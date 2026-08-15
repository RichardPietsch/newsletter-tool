import { lt } from 'drizzle-orm';
import { db } from '@/lib/db';
import { auditEvents, authMagicLinks, authRateLimits, sessions } from '@/lib/db/schema';

export function retentionCutoffs(now = new Date()) {
  return {
    audit: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
    expiredState: now,
  };
}

export async function purgeExpiredData(now = new Date()) {
  const cutoff = retentionCutoffs(now);
  await db.transaction(async (tx) => {
    await tx.delete(auditEvents).where(lt(auditEvents.createdAt, cutoff.audit));
    await tx.delete(authRateLimits).where(lt(authRateLimits.expiresAt, cutoff.expiredState));
    await tx.delete(authMagicLinks).where(lt(authMagicLinks.expiresAt, cutoff.audit));
    await tx.delete(sessions).where(lt(sessions.expiresAt, cutoff.audit));
  });
}

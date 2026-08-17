import { and, eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from '@/lib/db';
import { createAuditEventRecord, recordAuditEvent } from '@/lib/db/audit-events';
import { auditEvents, authMagicLinks, tenants, users } from '@/lib/db/schema';
import { sendEmail } from '@/lib/email/send-email';
import { magicLinkEmail } from '@/lib/email/templates/magic-link';
import { publicAppUrl } from '@/lib/app-url';
import { logger } from '@/lib/logging/logger';
import { createSession } from './session';
import { MAGIC_LINK_TTL_MINUTES, normalizeEmail } from './config';
import { consumeMagicLinkToken } from './magic-link-consumption';
import { takeRateLimit } from './rate-limit';
import { createSecureToken, hashToken } from './tokens';

const MINIMUM_RESPONSE_MS = 400;

async function waitForMinimum(startedAt: number) {
  const remaining = MINIMUM_RESPONSE_MS - (Date.now() - startedAt);
  if (remaining > 0) await new Promise((resolve) => setTimeout(resolve, remaining));
}

export async function requestMagicLink(
  emailInput: string,
  metadata: { ip?: string | null; userAgent?: string | null; correlationId?: string } = {},
) {
  const startedAt = Date.now();
  const email = normalizeEmail(emailInput);
  const ip = metadata.ip || 'unknown';
  const [emailAllowed, ipAllowed] = await Promise.all([
    takeRateLimit('magic_link_email', email, 5),
    takeRateLimit('magic_link_ip', ip, 20),
  ]);

  if (!emailAllowed || !ipAllowed) {
    await waitForMinimum(startedAt);
    return;
  }

  const [row] = await db
    .select({ user: users, tenant: tenants })
    .from(users)
    .leftJoin(tenants, eq(users.tenantId, tenants.id))
    .where(eq(users.email, email));
  const eligible =
    row?.user.status === 'active' &&
    (row.user.role === 'platform_admin' || (row.tenant !== null && row.tenant.status === 'active'));

  if (!row || !eligible) {
    await waitForMinimum(startedAt);
    return;
  }

  const token = createSecureToken();
  const expiresAt = new Date(Date.now() + MAGIC_LINK_TTL_MINUTES * 60 * 1000);
  await db.insert(authMagicLinks).values({
    id: nanoid(),
    userId: row.user.id,
    email,
    tokenHash: hashToken(token),
    expiresAt,
    requestedIp: metadata.ip?.slice(0, 64) || null,
    userAgent: metadata.userAgent?.slice(0, 512) || null,
  });

  const url = publicAppUrl('/auth/magic-link/verify');
  url.searchParams.set('token', token);
  const message = magicLinkEmail({ url: url.toString(), ttlMinutes: MAGIC_LINK_TTL_MINUTES });
  try {
    await sendEmail({ to: email, subject: 'Dein Zugangslink zum Newsletter Tool', ...message });
    await recordAuditEvent({
      actorUserId: row.user.id,
      tenantId: row.user.tenantId,
      eventType: 'auth.magic_link.requested',
      summary: 'Magic Link angefordert.',
      correlationId: metadata.correlationId,
    });
  } catch (error) {
    logger.error(
      {
        event: 'auth.magic_link.delivery_failed',
        userId: row.user.id,
        tenantId: row.user.tenantId ?? undefined,
        requestId: metadata.correlationId,
      },
      { error },
    );
    await recordAuditEvent({
      actorUserId: row.user.id,
      tenantId: row.user.tenantId,
      eventType: 'application.error',
      severity: 'error',
      outcome: 'failed',
      summary: 'Magic Link konnte nicht versendet werden.',
      correlationId: metadata.correlationId,
      metadata: { operation: 'magic_link_delivery' },
    });
  }
  await waitForMinimum(startedAt);
}

export async function verifyMagicLink(
  token: string,
  metadata: { ip?: string | null; userAgent?: string | null; correlationId?: string } = {},
) {
  const verifyAllowed = await takeRateLimit('magic_link_verify_ip', metadata.ip || 'unknown', 30);
  if (!verifyAllowed) return null;

  const result = await db.transaction(async (tx) => {
    const consumed = await consumeMagicLinkToken(hashToken(token), new Date(), tx);
    if (!consumed) return { status: 'invalid' as const };

    const [row] = await tx
      .select({ user: users, tenant: tenants })
      .from(users)
      .leftJoin(tenants, eq(users.tenantId, tenants.id))
      .where(and(eq(users.id, consumed.userId), eq(users.email, consumed.email)));
    const eligible =
      row?.user.status === 'active' &&
      (row.user.role === 'platform_admin' || (row.tenant !== null && row.tenant.status === 'active'));
    if (!row || !eligible) {
      const event = createAuditEventRecord({
        actorUserId: row?.user.id,
        tenantId: row?.user.tenantId,
        eventType: 'auth.login_failed',
        severity: 'warning',
        outcome: 'failed',
        summary: 'Login für inaktiven Account oder Mandanten abgewiesen.',
        correlationId: metadata.correlationId,
        metadata: { reason: 'inactive' },
      });
      await tx.insert(auditEvents).values(event);
      if (event.tenantId) {
        await tx
          .update(tenants)
          .set({ lastActivityAt: event.createdAt, updatedAt: event.createdAt })
          .where(eq(tenants.id, event.tenantId));
      }
      return { status: 'inactive' as const };
    }

    const now = new Date();
    const [user] = await tx
      .update(users)
      .set({ emailVerifiedAt: now, lastLoginAt: now, updatedAt: now })
      .where(eq(users.id, consumed.userId))
      .returning();
    const sessionToken = await createSession(
      consumed.userId,
      { ipAddress: metadata.ip, userAgent: metadata.userAgent },
      tx,
    );
    const event = createAuditEventRecord({
      actorUserId: consumed.userId,
      tenantId: user.tenantId,
      eventType: 'auth.login_succeeded',
      summary: 'Login erfolgreich.',
      correlationId: metadata.correlationId,
    });
    await tx.insert(auditEvents).values(event);
    if (event.tenantId) {
      await tx
        .update(tenants)
        .set({ lastActivityAt: event.createdAt, updatedAt: event.createdAt })
        .where(eq(tenants.id, event.tenantId));
    }
    return { status: 'succeeded' as const, user, sessionToken };
  });

  if (result.status === 'invalid') {
    await recordAuditEvent({
      eventType: 'auth.login_failed',
      severity: 'warning',
      outcome: 'failed',
      summary: 'Ungültiger oder abgelaufener Magic Link.',
      correlationId: metadata.correlationId,
      metadata: { reason: 'invalid_or_expired' },
    });
    return null;
  }
  return result.status === 'inactive' ? null : { user: result.user, sessionToken: result.sessionToken };
}

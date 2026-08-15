import { and, eq, gt, isNull, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from '@/lib/db';
import { sessions, tenants, users } from '@/lib/db/schema';
import { SESSION_DAYS, SESSION_IDLE_HOURS } from './config';
import { createSecureToken, hashToken } from './tokens';

export type AuthUser = typeof users.$inferSelect;
export type AuthTenant = typeof tenants.$inferSelect;
export type AuthContext = {
  user: AuthUser;
  sessionId: string;
  mode: 'admin' | 'member' | 'support';
  tenant: AuthTenant | null;
};

type SessionWriter = Pick<typeof db, 'insert'>;

export function isSessionPrincipalActive(user: Pick<AuthUser, 'role' | 'status'>, tenant: AuthTenant | null) {
  return (
    user.status === 'active' && (user.role === 'platform_admin' || (tenant !== null && tenant.status === 'active'))
  );
}

export async function createSession(
  userId: string,
  metadata: { userAgent?: string | null; ipAddress?: string | null } = {},
  client: SessionWriter = db,
) {
  const token = createSecureToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await client.insert(sessions).values({
    id: nanoid(),
    userId,
    sessionTokenHash: hashToken(token),
    expiresAt,
    userAgent: metadata.userAgent?.slice(0, 512) || null,
    ipAddress: metadata.ipAddress?.slice(0, 64) || null,
  });
  return token;
}

export async function validateSession(token: string): Promise<AuthContext | null> {
  const now = new Date();
  const [row] = await db
    .select({
      user: users,
      sessionId: sessions.id,
      sessionLastSeenAt: sessions.lastSeenAt,
      supportTenantId: sessions.supportTenantId,
      tenant: tenants,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .leftJoin(tenants, eq(users.tenantId, tenants.id))
    .where(
      and(eq(sessions.sessionTokenHash, hashToken(token)), isNull(sessions.revokedAt), gt(sessions.expiresAt, now)),
    );
  if (!row) return null;

  const idleMs = SESSION_IDLE_HOURS * 60 * 60 * 1000;
  const idle = now.getTime() - row.sessionLastSeenAt.getTime() > idleMs;
  if (!isSessionPrincipalActive(row.user, row.tenant) || idle) {
    await db.update(sessions).set({ revokedAt: now }).where(eq(sessions.id, row.sessionId));
    return null;
  }

  if (now.getTime() - row.sessionLastSeenAt.getTime() > 10 * 60 * 1000) {
    await db.update(sessions).set({ lastSeenAt: now }).where(eq(sessions.id, row.sessionId));
  }

  if (row.user.role === 'tenant_member') {
    return { user: row.user, sessionId: row.sessionId, mode: 'member', tenant: row.tenant };
  }

  if (!row.supportTenantId) {
    return { user: row.user, sessionId: row.sessionId, mode: 'admin', tenant: null };
  }
  const [supportTenant] = await db.select().from(tenants).where(eq(tenants.id, row.supportTenantId));
  if (!supportTenant) {
    await db
      .update(sessions)
      .set({ supportTenantId: null, supportStartedAt: null })
      .where(eq(sessions.id, row.sessionId));
    return { user: row.user, sessionId: row.sessionId, mode: 'admin', tenant: null };
  }
  return { user: row.user, sessionId: row.sessionId, mode: 'support', tenant: supportTenant };
}

export async function revokeSession(token: string) {
  await db
    .update(sessions)
    .set({ revokedAt: new Date() })
    .where(eq(sessions.sessionTokenHash, hashToken(token)));
}

export async function revokeSessionsForUser(userId: string) {
  await db
    .update(sessions)
    .set({ revokedAt: new Date() })
    .where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt)));
}

export async function revokeSessionsForTenant(tenantId: string) {
  await db.execute(sql`
    update ${sessions}
    set revoked_at = now()
    where revoked_at is null
      and user_id in (select id from ${users} where tenant_id = ${tenantId})
  `);
}

export async function startSupportMode(sessionId: string, tenantId: string) {
  await db
    .update(sessions)
    .set({ supportTenantId: tenantId, supportStartedAt: new Date() })
    .where(eq(sessions.id, sessionId));
}

export async function endSupportMode(sessionId: string) {
  await db.update(sessions).set({ supportTenantId: null, supportStartedAt: null }).where(eq(sessions.id, sessionId));
}

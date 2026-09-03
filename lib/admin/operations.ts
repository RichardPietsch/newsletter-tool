import { and, eq, inArray, isNull } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from '@/lib/db';
import { createAuditEventRecord } from '@/lib/db/audit-events';
import {
  appSettings,
  auditEvents,
  sessions,
  tenants,
  users,
  type TenantStatus,
  type UserStatus,
} from '@/lib/db/schema';
import { seedNewsletterTemplatesForTenant } from '@/lib/newsletter/template-files';
import { normalizeEmail } from '@/lib/auth/config';
import { createDefaultSettings } from '@/lib/settings/defaults';

type Actor = { id: string };

export async function createTenant(
  input: { name: string; adminNotes?: string | null },
  actor: Actor,
  correlationId: string,
) {
  const id = nanoid();
  const event = createAuditEventRecord({
    eventType: 'tenant.created',
    tenantId: id,
    actorUserId: actor.id,
    summary: 'Mandant angelegt.',
    correlationId,
    entityType: 'tenant',
    entityId: id,
  });
  await db.transaction(async (tx) => {
    await tx.insert(tenants).values({
      id,
      name: input.name.trim(),
      adminNotes: input.adminNotes?.trim() || null,
      lastActivityAt: event.createdAt,
    });
    await tx.insert(auditEvents).values(event);
    await tx.insert(appSettings).values({ id, tenantId: id, settings: createDefaultSettings() });
  });
  await seedNewsletterTemplatesForTenant(id);
  return id;
}

export async function updateTenantDetails(tenantId: string, input: { name: string; adminNotes?: string | null }) {
  const [tenant] = await db
    .update(tenants)
    .set({ name: input.name.trim(), adminNotes: input.adminNotes?.trim() || null, updatedAt: new Date() })
    .where(eq(tenants.id, tenantId))
    .returning();
  return tenant ?? null;
}

export async function setTenantStatus(tenantId: string, status: TenantStatus, actor: Actor, correlationId: string) {
  const eventType = status === 'active' ? 'tenant.reactivated' : 'tenant.deactivated';
  const event = createAuditEventRecord({
    eventType,
    tenantId,
    actorUserId: actor.id,
    summary: status === 'active' ? 'Mandant reaktiviert.' : 'Mandant deaktiviert.',
    correlationId,
    entityType: 'tenant',
    entityId: tenantId,
  });
  return db.transaction(async (tx) => {
    const [tenant] = await tx
      .update(tenants)
      .set({ status, updatedAt: event.createdAt, lastActivityAt: event.createdAt })
      .where(eq(tenants.id, tenantId))
      .returning();
    if (!tenant) return null;
    if (status === 'inactive') {
      const tenantUsers = tx.select({ id: users.id }).from(users).where(eq(users.tenantId, tenantId));
      await tx
        .update(sessions)
        .set({ revokedAt: event.createdAt })
        .where(and(isNull(sessions.revokedAt), inArray(sessions.userId, tenantUsers)));
    }
    await tx.insert(auditEvents).values(event);
    return tenant;
  });
}

export async function createTenantAccount(
  tenantId: string,
  input: { name: string; email: string },
  actor: Actor,
  correlationId: string,
) {
  const id = nanoid();
  const event = createAuditEventRecord({
    eventType: 'account.created',
    tenantId,
    actorUserId: actor.id,
    summary: 'Mitarbeiter-Account angelegt.',
    correlationId,
    entityType: 'user',
    entityId: id,
  });
  await db.transaction(async (tx) => {
    await tx.insert(users).values({
      id,
      tenantId,
      role: 'tenant_member',
      status: 'active',
      name: input.name.trim(),
      email: normalizeEmail(input.email),
    });
    await tx.update(tenants).set({ lastActivityAt: event.createdAt }).where(eq(tenants.id, tenantId));
    await tx.insert(auditEvents).values(event);
  });
  return id;
}

export async function setAccountStatus(
  tenantId: string,
  userId: string,
  status: UserStatus,
  actor: Actor,
  correlationId: string,
) {
  const eventType = status === 'active' ? 'account.reactivated' : 'account.deactivated';
  const event = createAuditEventRecord({
    eventType,
    tenantId,
    actorUserId: actor.id,
    summary: status === 'active' ? 'Mitarbeiter-Account reaktiviert.' : 'Mitarbeiter-Account deaktiviert.',
    correlationId,
    entityType: 'user',
    entityId: userId,
  });
  return db.transaction(async (tx) => {
    const [user] = await tx
      .update(users)
      .set({ status, updatedAt: event.createdAt })
      .where(and(eq(users.id, userId), eq(users.tenantId, tenantId), eq(users.role, 'tenant_member')))
      .returning();
    if (!user) return null;
    if (status === 'inactive') {
      await tx
        .update(sessions)
        .set({ revokedAt: event.createdAt })
        .where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt)));
    }
    await tx.update(tenants).set({ lastActivityAt: event.createdAt }).where(eq(tenants.id, tenantId));
    await tx.insert(auditEvents).values(event);
    return user;
  });
}

import { and, eq, isNull, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { db } from '@/lib/db';
import { createAuditEventRecord } from '@/lib/db/audit-events';
import { auditEvents, installationState, sessions, users, type BootstrapSource } from '@/lib/db/schema';

const INSTALLATION_STATE_ID = 'primary';
const BOOTSTRAP_LOCK_KEY = 'newsletter-tool:initial-admin';

const identitySchema = z.object({
  email: z
    .string()
    .trim()
    .email()
    .max(320)
    .transform((email) => email.toLowerCase()),
  name: z.string().trim().min(1).max(160),
});

type ExistingAdmin = Pick<typeof users.$inferSelect, 'id' | 'email' | 'status'>;
type ExistingInstallationState = Pick<typeof installationState.$inferSelect, 'initialAdminUserId'>;

export type InitialAdminDecision =
  | { kind: 'create' }
  | { kind: 'register'; admin: ExistingAdmin }
  | { kind: 'already_initialized'; admin: ExistingAdmin };

export function decideInitialAdminBootstrap(
  configuredEmail: string,
  state: ExistingInstallationState | null,
  admin: ExistingAdmin | null,
): InitialAdminDecision {
  if (state) {
    if (!admin || admin.id !== state.initialAdminUserId) {
      throw new Error('Installation state does not match the platform administrator.');
    }
    if (admin.email !== configuredEmail) {
      throw new Error(
        'Installation is already initialized for a different administrator. ' +
          'Changing BOOTSTRAP_ADMIN_EMAIL never changes privileges.',
      );
    }
    return { kind: 'already_initialized', admin };
  }

  if (!admin) return { kind: 'create' };
  if (admin.email !== configuredEmail) {
    throw new Error(
      'A platform administrator already exists with a different email. ' +
        'Use the explicit recovery command if the administrator identity must change.',
    );
  }
  return { kind: 'register', admin };
}

export async function bootstrapInitialAdmin(input: { email: string; name: string; source: BootstrapSource }) {
  const parsed = identitySchema.parse(input);

  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${BOOTSTRAP_LOCK_KEY}))`);
    const [state] = await tx.select().from(installationState).where(eq(installationState.id, INSTALLATION_STATE_ID));
    const [admin] = await tx.select().from(users).where(eq(users.role, 'platform_admin'));
    const decision = decideInitialAdminBootstrap(parsed.email, state ?? null, admin ?? null);

    if (decision.kind === 'already_initialized') {
      return { status: decision.kind, adminId: decision.admin.id, email: decision.admin.email } as const;
    }

    const now = new Date();
    let adminId: string;
    if (decision.kind === 'create') {
      const [emailOwner] = await tx.select({ id: users.id }).from(users).where(eq(users.email, parsed.email));
      if (emailOwner) throw new Error('The configured bootstrap email is already used by another account.');
      adminId = nanoid();
      await tx.insert(users).values({
        id: adminId,
        tenantId: null,
        role: 'platform_admin',
        status: 'active',
        email: parsed.email,
        name: parsed.name,
      });
    } else {
      adminId = decision.admin.id;
    }

    await tx.insert(installationState).values({
      id: INSTALLATION_STATE_ID,
      initialAdminUserId: adminId,
      bootstrapSource: input.source,
      bootstrapCompletedAt: now,
      createdAt: now,
      updatedAt: now,
    });
    await tx.insert(auditEvents).values(
      createAuditEventRecord({
        eventType: 'system.bootstrap_admin_initialized',
        actorUserId: adminId,
        summary:
          decision.kind === 'create'
            ? 'Initialer Plattform-Admin angelegt.'
            : 'Bestehender Plattform-Admin als Installationseigentümer registriert.',
        entityType: 'user',
        entityId: adminId,
        metadata: { source: input.source, existingAccount: decision.kind === 'register' },
      }),
    );
    return { status: decision.kind === 'create' ? 'created' : 'registered', adminId, email: parsed.email } as const;
  });
}

export async function recoverPlatformAdmin(input: { currentEmail: string; email: string; name: string }) {
  const parsed = identitySchema.parse(input);
  const currentEmail = z.string().trim().email().parse(input.currentEmail).toLowerCase();

  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${BOOTSTRAP_LOCK_KEY}))`);
    const [admin] = await tx.select().from(users).where(eq(users.role, 'platform_admin'));
    if (!admin) throw new Error('No platform administrator exists. Use the initial bootstrap command.');
    if (admin.email !== currentEmail) throw new Error('The current administrator email confirmation does not match.');

    const [emailOwner] = await tx.select({ id: users.id }).from(users).where(eq(users.email, parsed.email));
    if (emailOwner && emailOwner.id !== admin.id) throw new Error('The new email is already used by another account.');

    const now = new Date();
    const identityChanged = admin.email !== parsed.email;
    await tx
      .update(users)
      .set({ email: parsed.email, name: parsed.name, status: 'active', updatedAt: now })
      .where(eq(users.id, admin.id));
    await tx
      .update(sessions)
      .set({ revokedAt: now })
      .where(and(eq(sessions.userId, admin.id), isNull(sessions.revokedAt)));

    const [state] = await tx
      .select({ id: installationState.id })
      .from(installationState)
      .where(eq(installationState.id, INSTALLATION_STATE_ID));
    if (!state) {
      await tx.insert(installationState).values({
        id: INSTALLATION_STATE_ID,
        initialAdminUserId: admin.id,
        bootstrapSource: 'cli',
        bootstrapCompletedAt: now,
        createdAt: now,
        updatedAt: now,
      });
    }

    await tx.insert(auditEvents).values(
      createAuditEventRecord({
        eventType: 'system.admin_recovered',
        actorUserId: admin.id,
        severity: 'warning',
        summary: 'Plattform-Admin über lokalen Operatorzugriff wiederhergestellt.',
        entityType: 'user',
        entityId: admin.id,
        metadata: { source: 'cli', identityChanged, sessionsRevoked: true },
      }),
    );
    return { adminId: admin.id, email: parsed.email };
  });
}

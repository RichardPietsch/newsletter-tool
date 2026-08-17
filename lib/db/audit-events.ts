import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { logger } from '@/lib/logging/logger';
import { db } from './index';
import { auditEvents, tenants, type AuditOutcome, type AuditSeverity } from './schema';

export type AuditEventType =
  | 'account.created'
  | 'account.deactivated'
  | 'account.reactivated'
  | 'application.error'
  | 'asset.uploaded'
  | 'auth.login_failed'
  | 'auth.login_succeeded'
  | 'auth.magic_link.requested'
  | 'newsletter.created'
  | 'newsletter.deleted'
  | 'newsletter.exported'
  | 'newsletter.marked_sent'
  | 'settings.updated'
  | 'support.ended'
  | 'support.started'
  | 'support.write_blocked'
  | 'system.admin_recovered'
  | 'system.bootstrap_admin_initialized'
  | 'tenant.created'
  | 'tenant.deactivated'
  | 'tenant.reactivated';

const SENSITIVE_KEY = /(?:authorization|cookie|document|email|header|password|secret|session|stack|token)/i;

function sanitizeValue(value: unknown, depth = 0): unknown {
  if (depth > 3) return '[TRUNCATED]';
  if (typeof value === 'string') return value.slice(0, 256);
  if (typeof value === 'number' || typeof value === 'boolean' || value === null) return value;
  if (Array.isArray(value)) return value.slice(0, 20).map((entry) => sanitizeValue(entry, depth + 1));
  if (!value || typeof value !== 'object') return String(value).slice(0, 256);
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !SENSITIVE_KEY.test(key))
      .slice(0, 20)
      .map(([key, entry]) => [key.slice(0, 64), sanitizeValue(entry, depth + 1)]),
  );
}

export function sanitizeAuditMetadata(metadata: Record<string, unknown> = {}) {
  const sanitized = sanitizeValue(metadata) as Record<string, unknown>;
  const json = JSON.stringify(sanitized);
  return Buffer.byteLength(json, 'utf8') <= 4096 ? sanitized : { truncated: true };
}

export type AuditEventInput = {
  eventType: AuditEventType;
  tenantId?: string | null;
  actorUserId?: string | null;
  /** Compatibility alias for callers being migrated from the original audit model. */
  userId?: string | null;
  severity?: AuditSeverity;
  outcome?: AuditOutcome;
  summary?: string;
  correlationId?: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
};

export type AuditEventRecord = {
  id: string;
  tenantId: string | null;
  actorUserId: string | null;
  eventType: AuditEventType;
  severity: AuditSeverity;
  outcome: AuditOutcome;
  summary: string;
  correlationId: string;
  entityType: string | null;
  entityId: string | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
};

type AuditEventWriter = (event: AuditEventRecord) => Promise<void>;

const writeAuditEvent: AuditEventWriter = async (event) => {
  await db.transaction(async (tx) => {
    await tx.insert(auditEvents).values(event);
    if (event.tenantId) {
      await tx
        .update(tenants)
        .set({ lastActivityAt: event.createdAt, updatedAt: event.createdAt })
        .where(eq(tenants.id, event.tenantId));
    }
  });
};

export function createAuditEventRecord(input: AuditEventInput): AuditEventRecord {
  return {
    id: nanoid(),
    tenantId: input.tenantId ?? null,
    actorUserId: input.actorUserId ?? input.userId ?? null,
    eventType: input.eventType,
    severity: input.severity ?? 'info',
    outcome: input.outcome ?? 'succeeded',
    summary: (input.summary ?? input.eventType).replace(/[\r\n\t]+/g, ' ').slice(0, 240),
    correlationId: (input.correlationId ?? randomUUID()).replace(/[^a-zA-Z0-9._:-]/g, '').slice(0, 128) || randomUUID(),
    entityType: input.entityType?.slice(0, 64) ?? null,
    entityId: input.entityId?.slice(0, 128) ?? null,
    metadata: sanitizeAuditMetadata(input.metadata),
    createdAt: new Date(),
  };
}

export async function recordAuditEvent(input: AuditEventInput, writer: AuditEventWriter = writeAuditEvent) {
  const event = createAuditEventRecord(input);
  try {
    await writer(event);
    return true;
  } catch {
    logger.error(
      { event: 'audit.record_failed', userId: event.actorUserId ?? undefined, tenantId: event.tenantId ?? undefined },
      { auditEventType: event.eventType, entityId: event.entityId },
    );
    return false;
  }
}

export async function recordCriticalAuditEvent(input: AuditEventInput, writer: AuditEventWriter = writeAuditEvent) {
  await writer(createAuditEventRecord(input));
}

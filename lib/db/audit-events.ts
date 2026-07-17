import { nanoid } from 'nanoid';
import { logger } from '@/lib/logging/logger';
import { db } from './index';
import { auditEvents } from './schema';

export type AuditEventType =
  | 'asset.uploaded'
  | 'auth.login.succeeded'
  | 'auth.magic_link.requested'
  | 'newsletter.deleted'
  | 'newsletter.exported'
  | 'newsletter.marked_sent'
  | 'settings.updated';

export type AuditEventInput = {
  userId: string;
  eventType: AuditEventType;
  entityId?: string;
};

export type AuditEventRecord = {
  id: string;
  userId: string;
  eventType: AuditEventType;
  entityId: string | null;
  createdAt: Date;
};

type AuditEventWriter = (event: AuditEventRecord) => Promise<void>;

const writeAuditEvent: AuditEventWriter = async (event) => {
  await db.insert(auditEvents).values(event);
};

export async function recordAuditEvent(input: AuditEventInput, writer: AuditEventWriter = writeAuditEvent) {
  const event: AuditEventRecord = {
    id: nanoid(),
    userId: input.userId,
    eventType: input.eventType,
    entityId: input.entityId ?? null,
    createdAt: new Date(),
  };

  try {
    await writer(event);
    return true;
  } catch {
    logger.error(
      { event: 'audit.record_failed', userId: input.userId },
      { auditEventType: input.eventType, entityId: input.entityId },
    );
    return false;
  }
}

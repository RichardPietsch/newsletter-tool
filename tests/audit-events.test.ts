import { afterEach, describe, expect, it, vi } from 'vitest';
import { recordAuditEvent, type AuditEventRecord } from '@/lib/db/audit-events';

afterEach(() => vi.restoreAllMocks());

describe('audit events', () => {
  it('stores only the structured audit fields', async () => {
    const writer = vi.fn(async (_event: AuditEventRecord) => undefined);
    const unsafeInput = {
      userId: 'user-1',
      eventType: 'newsletter.exported' as const,
      entityId: 'newsletter-1',
      token: 'must-not-be-persisted',
      html: '<p>must not be persisted</p>',
    };

    await expect(recordAuditEvent(unsafeInput, writer)).resolves.toBe(true);

    expect(writer).toHaveBeenCalledOnce();
    expect(writer.mock.calls[0]?.[0]).toEqual({
      id: expect.any(String),
      tenantId: null,
      actorUserId: 'user-1',
      eventType: 'newsletter.exported',
      severity: 'info',
      outcome: 'succeeded',
      summary: 'newsletter.exported',
      correlationId: expect.any(String),
      entityType: null,
      entityId: 'newsletter-1',
      metadata: {},
      createdAt: expect.any(Date),
    });
  });

  it('does not fail the completed product action when audit persistence is unavailable', async () => {
    const writer = vi.fn(async () => {
      throw new Error('database unavailable');
    });
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await expect(recordAuditEvent({ userId: 'user-1', eventType: 'settings.updated' }, writer)).resolves.toBe(false);
  });
});

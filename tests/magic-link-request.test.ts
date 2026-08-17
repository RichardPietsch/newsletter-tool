// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  rows: [] as Array<{ user: Record<string, unknown>; tenant: Record<string, unknown> | null }>,
  insertValues: vi.fn(async () => undefined),
  sendEmail: vi.fn(async (_message: { html: string }) => undefined),
  recordAuditEvent: vi.fn(async () => true),
}));

vi.mock('drizzle-orm', () => ({
  and: (...conditions: unknown[]) => ({ conditions }),
  eq: (column: unknown, value: unknown) => ({ column, value }),
}));
vi.mock('@/lib/db/schema', () => ({
  users: { id: 'users.id', email: 'users.email', tenantId: 'users.tenantId' },
  tenants: { id: 'tenants.id' },
  authMagicLinks: { id: 'links.id' },
}));
vi.mock('@/lib/db', () => ({
  db: {
    select: () => ({ from: () => ({ leftJoin: () => ({ where: async () => mocks.rows }) }) }),
    insert: () => ({ values: mocks.insertValues }),
  },
}));
vi.mock('@/lib/auth/rate-limit', () => ({ takeRateLimit: vi.fn(async () => true) }));
vi.mock('@/lib/auth/session', () => ({ createSession: vi.fn() }));
vi.mock('@/lib/email/send-email', () => ({ sendEmail: mocks.sendEmail }));
vi.mock('@/lib/db/audit-events', () => ({ recordAuditEvent: mocks.recordAuditEvent }));

import { requestMagicLink } from '@/lib/auth/magic-link';

describe('magic-link account provisioning', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mocks.rows = [];
    mocks.insertValues.mockClear();
    mocks.sendEmail.mockClear();
    mocks.recordAuditEvent.mockClear();
  });

  afterEach(() => vi.useRealTimers());

  async function request() {
    const result = requestMagicLink('tester@example.test', { ip: '127.0.0.1' });
    await vi.runAllTimersAsync();
    await result;
  }

  it('does not create an account or link for an unknown email address', async () => {
    await request();
    expect(mocks.insertValues).not.toHaveBeenCalled();
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });

  it('sends a link only for an existing active account of an active tenant', async () => {
    mocks.rows = [
      {
        user: { id: 'user-1', tenantId: 'tenant-1', role: 'tenant_member', status: 'active' },
        tenant: { id: 'tenant-1', status: 'active' },
      },
    ];
    await request();
    expect(mocks.insertValues).toHaveBeenCalledOnce();
    expect(mocks.sendEmail).toHaveBeenCalledOnce();
    expect(mocks.sendEmail.mock.calls[0]?.[0]).toMatchObject({
      html: expect.stringContaining('/auth/magic-link/verify?token='),
    });
  });

  it('does not send a link for a deactivated tenant', async () => {
    mocks.rows = [
      {
        user: { id: 'user-1', tenantId: 'tenant-1', role: 'tenant_member', status: 'active' },
        tenant: { id: 'tenant-1', status: 'inactive' },
      },
    ];
    await request();
    expect(mocks.insertValues).not.toHaveBeenCalled();
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });
});

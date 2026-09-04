// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from 'vitest';

type Row = {
  id: string;
  tenantId: string;
  title: string;
  category?: string;
  createdAt: Date;
  updatedAt: Date;
};
type Condition = { op: 'eq'; column: string; value: string } | { op: 'and'; conditions: Condition[] };

const mocks = vi.hoisted(() => ({
  rows: [] as Row[],
  tenantId: 'tenant-1',
  recordAuditEvent: vi.fn(async () => true),
}));

function filters(condition?: Condition): Record<string, string> {
  if (!condition) return {};
  if (condition.op === 'eq') return { [condition.column]: condition.value };
  return Object.assign({}, ...condition.conditions.map(filters));
}

function matching(condition?: Condition) {
  const values = filters(condition);
  return mocks.rows.filter(
    (row) => (!values.id || row.id === values.id) && (!values.tenantId || row.tenantId === values.tenantId),
  );
}

vi.mock('drizzle-orm', () => ({
  eq: (column: string, value: string) => ({ op: 'eq', column, value }),
  and: (...conditions: Condition[]) => ({ op: 'and', conditions }),
}));

vi.mock('@/lib/db/schema', () => ({
  events: { id: 'id', tenantId: 'tenantId' },
}));

vi.mock('@/lib/auth/current-user', () => ({
  requireTenantApiContext: vi.fn(async () => ({
    context: {
      user: { id: 'user-1' },
      tenant: { id: mocks.tenantId },
      mode: 'member',
      sessionId: 'session-1',
    },
    response: null,
  })),
}));

vi.mock('@/lib/db/audit-events', () => ({ recordAuditEvent: mocks.recordAuditEvent }));

vi.mock('@/lib/db', () => ({
  db: {
    select: () => ({ from: () => ({ where: async (condition: Condition) => matching(condition) }) }),
    insert: () => ({
      values: (row: Row) => ({
        returning: async () => {
          const stored = { ...row, createdAt: row.createdAt ?? new Date(), updatedAt: row.updatedAt ?? new Date() };
          mocks.rows.push(stored);
          return [stored];
        },
      }),
    }),
    update: () => ({
      set: (patch: Partial<Row>) => ({
        where: (condition: Condition) => ({
          returning: async () => {
            const rows = matching(condition);
            rows.forEach((row) => Object.assign(row, patch));
            return rows;
          },
        }),
      }),
    }),
    delete: () => ({
      where: (condition: Condition) => ({
        returning: async () => {
          const rows = matching(condition);
          mocks.rows = mocks.rows.filter((row) => !rows.includes(row));
          return rows.map(({ id }) => ({ id }));
        },
      }),
    }),
  },
}));

import { DELETE, GET, POST, PUT } from '@/app/api/events/route';

function request(method: 'POST' | 'PUT' | 'DELETE', body: unknown) {
  return new Request('http://localhost:3000/api/events', {
    method,
    headers: { origin: 'http://localhost:3000', 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('events API route', () => {
  beforeEach(() => {
    mocks.rows = [];
    mocks.tenantId = 'tenant-1';
    mocks.recordAuditEvent.mockClear();
  });

  it('returns only events owned by the authenticated tenant', async () => {
    const now = new Date();
    mocks.rows = [
      { id: 'event-1', tenantId: 'tenant-1', title: 'Eigenes Event', createdAt: now, updatedAt: now },
      { id: 'event-2', tenantId: 'tenant-2', title: 'Fremdes Event', createdAt: now, updatedAt: now },
    ];
    const response = await GET();
    const payload = (await response.json()) as Row[];
    expect(payload.map((event) => event.id)).toEqual(['event-1']);
  });

  it('creates a reusable event and records an audit event', async () => {
    const response = await POST(
      request('POST', { title: 'Vortrag', speakerName: 'Ada', speakerRole: 'CEO', buttonUrl: '' }),
    );
    const payload = (await response.json()) as Row;
    expect(response.status).toBe(201);
    expect(payload).toMatchObject({ tenantId: 'tenant-1', title: 'Vortrag' });
    expect(mocks.recordAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'event.created', tenantId: 'tenant-1', entityId: payload.id }),
    );
  });

  it('updates an owned event and records the register change', async () => {
    const now = new Date();
    mocks.rows = [{ id: 'event-1', tenantId: 'tenant-1', title: 'Alter Titel', createdAt: now, updatedAt: now }];

    const response = await PUT(request('PUT', { id: 'event-1', title: 'Neuer Titel' }));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ id: 'event-1', title: 'Neuer Titel' });
    expect(mocks.recordAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'event.updated', tenantId: 'tenant-1', entityId: 'event-1' }),
    );
  });

  it('cannot update or delete an event from another tenant', async () => {
    const now = new Date();
    mocks.rows = [{ id: 'event-2', tenantId: 'tenant-2', title: 'Fremd', createdAt: now, updatedAt: now }];
    expect((await PUT(request('PUT', { id: 'event-2', title: 'Manipuliert' }))).status).toBe(404);
    expect((await DELETE(request('DELETE', { id: 'event-2' }))).status).toBe(404);
    expect(mocks.rows[0].title).toBe('Fremd');
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createBlock, createDefaultDocument } from '@/lib/newsletter/defaults';
import { insertBlock } from '@/lib/newsletter/operations';
import type { NewsletterDocument } from '@/lib/newsletter/schema';

type NewsletterRow = {
  id: string;
  tenantId: string;
  title: string;
  document: NewsletterDocument;
  sentAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type Condition = { op: 'eq'; column: string; value: string } | { op: 'and'; conditions: Condition[] };

const mocks = vi.hoisted(() => ({
  rows: [] as NewsletterRow[],
  authUserId: 'user-1',
  authTenantId: 'tenant-1',
  recordAuditEvent: vi.fn(async () => true),
}));

vi.mock('@/lib/db/audit-events', () => ({ recordAuditEvent: mocks.recordAuditEvent }));

function conditionFilters(condition: Condition | undefined) {
  const filters: Record<string, string> = {};
  if (!condition) return filters;
  if (condition.op === 'eq') {
    filters[condition.column] = condition.value;
    return filters;
  }
  for (const entry of condition.conditions) Object.assign(filters, conditionFilters(entry));
  return filters;
}

function matchingRows(condition: Condition | undefined) {
  const filters = conditionFilters(condition);
  return mocks.rows.filter((row) => {
    if (filters.id && row.id !== filters.id) return false;
    if (filters.tenantId && row.tenantId !== filters.tenantId) return false;
    return true;
  });
}

vi.mock('drizzle-orm', () => ({
  and: (...conditions: Condition[]) => ({ op: 'and', conditions }),
  eq: (column: string, value: string) => ({ op: 'eq', column, value }),
}));

vi.mock('@/lib/db/schema', () => ({
  newsletters: {
    id: 'id',
    tenantId: 'tenantId',
    title: 'title',
    document: 'document',
    sentAt: 'sentAt',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
  },
}));

vi.mock('@/lib/auth/current-user', () => ({
  requireTenantApiContext: vi.fn(async () => ({
    context: {
      user: { id: mocks.authUserId, email: 'user@example.com' },
      tenant: { id: mocks.authTenantId },
      mode: 'member',
      sessionId: 'session-1',
    },
    response: null,
  })),
}));

vi.mock('@/lib/db', () => ({
  db: {
    select: () => ({
      from: () => ({
        where: async (condition: Condition) => matchingRows(condition),
      }),
    }),
    update: () => ({
      set: (values: Partial<NewsletterRow>) => ({
        where: (condition: Condition) => ({
          returning: async () => {
            const rows = matchingRows(condition);
            for (const row of rows) Object.assign(row, values);
            return rows;
          },
        }),
      }),
    }),
    delete: () => ({
      where: (condition: Condition) => ({
        returning: async () => {
          const rows = matchingRows(condition);
          mocks.rows = mocks.rows.filter((row) => !rows.includes(row));
          return rows.map((row) => ({ id: row.id }));
        },
      }),
    }),
    insert: () => ({
      values: (value: Omit<NewsletterRow, 'createdAt' | 'updatedAt' | 'sentAt'> & Partial<NewsletterRow>) => {
        const inserted: NewsletterRow = {
          createdAt: new Date('2026-07-16T12:00:00.000Z'),
          updatedAt: new Date('2026-07-16T12:00:00.000Z'),
          sentAt: null,
          ...value,
        };
        mocks.rows.push(inserted);
        return { returning: async () => [inserted] };
      },
    }),
  },
}));

import { DELETE, GET, PATCH, POST, PUT } from '@/app/api/newsletters/[id]/route';
import { POST as POST_COLLECTION } from '@/app/api/newsletters/route';

function routeContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

function jsonRequest(method: string, body?: unknown) {
  return new Request('http://localhost:3000/api/newsletters/own', {
    method,
    headers: { 'content-type': 'application/json', origin: 'http://localhost:3000' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function row(overrides: Partial<NewsletterRow> = {}): NewsletterRow {
  const document = createDefaultDocument('Original');
  return {
    id: 'own',
    tenantId: 'tenant-1',
    title: document.title,
    document,
    sentAt: null,
    createdAt: new Date('2026-07-16T10:00:00.000Z'),
    updatedAt: new Date('2026-07-16T10:00:00.000Z'),
    ...overrides,
  };
}

async function responseJson(response: Response) {
  return response.json() as Promise<Record<string, unknown>>;
}

describe('newsletter detail API route', () => {
  beforeEach(() => {
    mocks.rows = [];
    mocks.authUserId = 'user-1';
    mocks.authTenantId = 'tenant-1';
    mocks.recordAuditEvent.mockClear();
  });

  it('returns the authenticated owner newsletter', async () => {
    mocks.rows = [row()];

    const response = await GET(new Request('http://localhost:3000/api/newsletters/own'), routeContext('own'));
    const payload = await responseJson(response);

    expect(response.status).toBe(200);
    expect(payload.id).toBe('own');
    expect(payload.tenantId).toBe('tenant-1');
  });

  it('records exactly one creation event when a blank newsletter is started', async () => {
    const response = await POST_COLLECTION(
      new Request('http://localhost:3000/api/newsletters', {
        method: 'POST',
        headers: { origin: 'http://localhost:3000' },
      }),
    );

    expect(response.status).toBe(303);
    expect(mocks.rows).toHaveLength(1);
    expect(mocks.rows[0].tenantId).toBe('tenant-1');
    expect(mocks.recordAuditEvent).toHaveBeenCalledOnce();
    expect(mocks.recordAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: 'user-1',
        tenantId: 'tenant-1',
        eventType: 'newsletter.created',
        metadata: { source: 'blank' },
      }),
    );
  });

  it('shares the tenant work state with another member of the same tenant', async () => {
    mocks.rows = [row()];
    mocks.authUserId = 'user-2';

    const response = await GET(new Request('http://localhost:3000/api/newsletters/own'), routeContext('own'));

    expect(response.status).toBe(200);
    expect((await responseJson(response)).tenantId).toBe('tenant-1');
  });

  it('hides newsletters belonging to another tenant', async () => {
    mocks.rows = [row({ tenantId: 'tenant-2' })];

    const response = await GET(new Request('http://localhost:3000/api/newsletters/own'), routeContext('own'));

    expect(response.status).toBe(404);
  });

  it('updates a valid editable newsletter document', async () => {
    const document = insertBlock(createDefaultDocument('Updated'), 1, createBlock('text'));
    mocks.rows = [row()];

    const response = await PUT(jsonRequest('PUT', { title: 'Updated', document }), routeContext('own'));
    const payload = await responseJson(response);

    expect(response.status).toBe(200);
    expect(payload.title).toBe('Updated');
    expect(mocks.rows[0].document.blocks).toHaveLength(3);
    expect(mocks.recordAuditEvent).not.toHaveBeenCalled();
  });

  it('rejects PUT updates for sent newsletters', async () => {
    const document = createDefaultDocument('Sent');
    mocks.rows = [row({ sentAt: new Date('2026-07-16T11:00:00.000Z') })];

    const response = await PUT(jsonRequest('PUT', { title: 'Sent', document }), routeContext('own'));
    const payload = await responseJson(response);

    expect(response.status).toBe(409);
    expect(payload.error).toMatchObject({ code: 'CONFLICT' });
  });

  it('returns a controlled validation error for invalid PUT payloads', async () => {
    const invalidDocument = { ...createDefaultDocument('Invalid'), blocks: [] };
    mocks.rows = [row()];

    const response = await PUT(jsonRequest('PUT', { document: invalidDocument }), routeContext('own'));
    const payload = await responseJson(response);

    expect(response.status).toBe(400);
    expect(payload.error).toMatchObject({ code: 'VALIDATION_ERROR' });
  });

  it('renames newsletters with PATCH', async () => {
    mocks.rows = [row()];

    const response = await PATCH(jsonRequest('PATCH', { title: 'Renamed' }), routeContext('own'));
    const payload = await responseJson(response);

    expect(response.status).toBe(200);
    expect(payload.title).toBe('Renamed');
    expect(mocks.rows[0].title).toBe('Renamed');
  });

  it('toggles the sent state with PATCH', async () => {
    mocks.rows = [row()];

    const sentResponse = await PATCH(jsonRequest('PATCH', { sent: true }), routeContext('own'));
    const sentPayload = await responseJson(sentResponse);
    const unsentResponse = await PATCH(jsonRequest('PATCH', { sent: false }), routeContext('own'));
    const unsentPayload = await responseJson(unsentResponse);

    expect(sentResponse.status).toBe(200);
    expect(typeof sentPayload.sentAt).toBe('string');
    expect(unsentResponse.status).toBe(200);
    expect(unsentPayload.sentAt).toBeNull();
    expect(mocks.rows[0].sentAt).toBeNull();
    expect(mocks.recordAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: 'user-1',
        tenantId: 'tenant-1',
        eventType: 'newsletter.marked_sent',
        entityId: 'own',
      }),
    );
  });

  it('deletes an owned newsletter', async () => {
    mocks.rows = [row()];

    const response = await DELETE(jsonRequest('DELETE'), routeContext('own'));
    const payload = await responseJson(response);

    expect(response.status).toBe(200);
    expect(payload).toEqual({ ok: true });
    expect(mocks.rows).toHaveLength(0);
    expect(mocks.recordAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: 'user-1',
        tenantId: 'tenant-1',
        eventType: 'newsletter.deleted',
        entityId: 'own',
      }),
    );
  });

  it('clones newsletters with fresh block IDs', async () => {
    const sourceDocument = insertBlock(createDefaultDocument('Original'), 1, createBlock('eventGrid'));
    mocks.rows = [row({ document: sourceDocument })];

    const response = await POST(jsonRequest('POST'), routeContext('own'));
    const payload = (await response.json()) as NewsletterRow & { location: string };
    const clonedDocument = payload.document;

    expect(response.status).toBe(201);
    expect(payload.location).toMatch(/^\/newsletters\//);
    expect(clonedDocument.title).toBe('Kopie von Original');
    expect(clonedDocument.blocks.map((block) => block.id)).not.toEqual(sourceDocument.blocks.map((block) => block.id));
    const sourceGrid = sourceDocument.blocks.find((block) => block.type === 'eventGrid');
    const cloneGrid = clonedDocument.blocks.find((block) => block.type === 'eventGrid');
    expect(sourceGrid?.type).toBe('eventGrid');
    expect(cloneGrid?.type).toBe('eventGrid');
    if (sourceGrid?.type !== 'eventGrid' || cloneGrid?.type !== 'eventGrid') throw new Error('event grid missing');
    expect(cloneGrid.items.map((item) => item.id)).not.toEqual(sourceGrid.items.map((item) => item.id));
    expect(mocks.recordAuditEvent).toHaveBeenCalledOnce();
    expect(mocks.recordAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: 'user-1',
        tenantId: 'tenant-1',
        eventType: 'newsletter.created',
        metadata: expect.objectContaining({ source: 'clone', sourceNewsletterId: 'own' }),
      }),
    );
  });
});

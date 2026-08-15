// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from 'vitest';

type AssetRow = {
  id: string;
  tenantId: string;
  title: string;
  altText: string;
  storageKey: string;
  publicUrl: string;
  originalFilename: string;
  mimeType: string;
  width: number;
  height: number;
  sizeBytes: number;
};

type Condition = { op: 'eq'; column: string; value: string } | { op: 'and'; conditions: Condition[] };

type UploadedAsset = Omit<AssetRow, 'id' | 'tenantId' | 'title' | 'altText'>;

const mocks = vi.hoisted(() => ({
  rows: [] as AssetRow[],
  authUserId: 'user-1',
  authTenantId: 'tenant-1',
  uploadResult: null as UploadedAsset | null,
  uploadError: null as Error | null,
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
  assets: {
    id: 'id',
    tenantId: 'tenantId',
    title: 'title',
    altText: 'altText',
    storageKey: 'storageKey',
    publicUrl: 'publicUrl',
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

vi.mock('@/lib/assets/upload', () => {
  class UploadValidationError extends Error {
    constructor(
      public readonly code: string,
      message: string,
    ) {
      super(message);
      this.name = 'UploadValidationError';
    }
  }

  return {
    UploadValidationError,
    validateAndUpload: vi.fn(async () => {
      if (mocks.uploadError) throw mocks.uploadError;
      if (!mocks.uploadResult)
        throw new UploadValidationError('UNSUPPORTED_FORMAT', 'Nur JPEG, PNG und GIF sind erlaubt.');
      return mocks.uploadResult;
    }),
  };
});

vi.mock('@/lib/db', () => ({
  db: {
    select: () => ({
      from: () => ({
        where: async (condition: Condition) => matchingRows(condition),
      }),
    }),
    insert: () => ({
      values: async (value: AssetRow) => {
        mocks.rows.push(value);
        return value;
      },
    }),
    update: () => ({
      set: (values: Partial<AssetRow>) => ({
        where: (condition: Condition) => ({
          returning: async () => {
            const rows = matchingRows(condition);
            for (const row of rows) Object.assign(row, values);
            return rows;
          },
        }),
      }),
    }),
  },
}));

import { GET, POST, PUT } from '@/app/api/assets/route';
import { UploadValidationError } from '@/lib/assets/upload';

function asset(overrides: Partial<AssetRow> = {}): AssetRow {
  return {
    id: 'asset-1',
    tenantId: 'tenant-1',
    title: 'Bild',
    altText: 'Alt',
    storageKey: 'asset.jpg',
    publicUrl: 'https://assets.example.com/asset.jpg',
    originalFilename: 'asset.jpg',
    mimeType: 'image/jpeg',
    width: 600,
    height: 400,
    sizeBytes: 1234,
    ...overrides,
  };
}

function jsonRequest(body: unknown) {
  return new Request('http://localhost:3000/api/assets', {
    method: 'PUT',
    headers: { 'content-type': 'application/json', origin: 'http://localhost:3000' },
    body: JSON.stringify(body),
  });
}

function formRequest(form: FormData) {
  return new Request('http://localhost:3000/api/assets', {
    method: 'POST',
    headers: { origin: 'http://localhost:3000' },
    body: form,
  });
}

async function responseJson(response: Response) {
  return response.json() as Promise<Record<string, unknown>>;
}

describe('assets API route', () => {
  beforeEach(() => {
    mocks.rows = [];
    mocks.authUserId = 'user-1';
    mocks.authTenantId = 'tenant-1';
    mocks.uploadResult = null;
    mocks.uploadError = null;
    mocks.recordAuditEvent.mockClear();
  });

  it('returns assets only for the authenticated tenant', async () => {
    mocks.rows = [asset(), asset({ id: 'asset-2', tenantId: 'tenant-2' })];

    const response = await GET();
    const payload = (await response.json()) as AssetRow[];

    expect(response.status).toBe(200);
    expect(payload.map((row) => row.id)).toEqual(['asset-1']);
  });

  it('returns 400 when upload is missing a file', async () => {
    const response = await POST(formRequest(new FormData()));
    const payload = await responseJson(response);

    expect(response.status).toBe(400);
    expect(payload.error).toMatchObject({ code: 'BAD_REQUEST' });
  });

  it('returns 400 for invalid upload formats', async () => {
    const form = new FormData();
    form.set('file', new File(['not-an-image'], 'note.txt', { type: 'text/plain' }));
    mocks.uploadError = new UploadValidationError('UNSUPPORTED_FORMAT', 'Nur JPEG, PNG und GIF sind erlaubt.');

    const response = await POST(formRequest(form));
    const payload = await responseJson(response);

    expect(response.status).toBe(400);
    expect(payload.error).toMatchObject({ code: 'BAD_REQUEST' });
  });

  it('returns 404 when updating an asset from another tenant', async () => {
    mocks.rows = [asset({ tenantId: 'tenant-2' })];

    const response = await PUT(jsonRequest({ id: 'asset-1', title: 'Neu' }));

    expect(response.status).toBe(404);
  });

  it('records a successful asset upload', async () => {
    const form = new FormData();
    form.set('file', new File(['image'], 'hero.jpg', { type: 'image/jpeg' }));
    mocks.uploadResult = {
      storageKey: 'hero.jpg',
      publicUrl: 'https://assets.example.com/hero.jpg',
      originalFilename: 'hero.jpg',
      mimeType: 'image/jpeg',
      width: 600,
      height: 400,
      sizeBytes: 5,
    };

    const response = await POST(formRequest(form));
    const payload = await responseJson(response);

    expect(response.status).toBe(200);
    expect(mocks.recordAuditEvent).toHaveBeenCalledWith(expect.objectContaining({
      actorUserId: 'user-1',
      tenantId: 'tenant-1',
      eventType: 'asset.uploaded',
      entityId: payload.id,
    }));
  });

  it('updates title and alt text for owned assets', async () => {
    mocks.rows = [asset()];

    const response = await PUT(jsonRequest({ id: 'asset-1', title: 'Hero', altText: 'Hero alt' }));
    const payload = await responseJson(response);

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({ id: 'asset-1', title: 'Hero', altText: 'Hero alt' });
    expect(mocks.rows[0]).toMatchObject({ title: 'Hero', altText: 'Hero alt' });
  });
});

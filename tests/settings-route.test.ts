import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GlobalSettings, GlobalSettingsInput } from '@/lib/settings/schema';

type SettingsRow = {
  id: string;
  tenantId: string;
  settings: GlobalSettingsInput;
  updatedAt: Date;
};

type Condition = { op: 'eq'; column: string; value: string };

const mocks = vi.hoisted(() => ({
  rows: [] as SettingsRow[],
  authUserId: 'user-1',
  authTenantId: 'tenant-1',
  recordAuditEvent: vi.fn(async () => true),
}));

vi.mock('@/lib/db/audit-events', () => ({ recordAuditEvent: mocks.recordAuditEvent }));

vi.mock('drizzle-orm', () => ({
  eq: (column: string, value: string) => ({ op: 'eq', column, value }),
}));

vi.mock('@/lib/db/schema', () => ({
  appSettings: {
    id: 'id',
    tenantId: 'tenantId',
    settings: 'settings',
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
        where: async (condition: Condition) => mocks.rows.filter((row) => row.id === condition.value),
      }),
    }),
    insert: () => ({
      values: (value: SettingsRow) => ({
        onConflictDoUpdate: async ({ set }: { set: Partial<SettingsRow> }) => {
          const existing = mocks.rows.find((row) => row.id === value.id);
          if (existing) Object.assign(existing, set);
          else mocks.rows.push(value);
        },
      }),
    }),
  },
}));

import { GET, PUT } from '@/app/api/settings/route';
import { createDefaultSettings } from '@/lib/settings/defaults';

function jsonRequest(body: unknown) {
  return new Request('http://localhost:3000/api/settings', {
    method: 'PUT',
    headers: { 'content-type': 'application/json', origin: 'http://localhost:3000' },
    body: JSON.stringify(body),
  });
}

async function responseJson(response: Response) {
  return response.json() as Promise<Record<string, unknown>>;
}

describe('settings API route', () => {
  beforeEach(() => {
    mocks.rows = [];
    mocks.authUserId = 'user-1';
    mocks.authTenantId = 'tenant-1';
    mocks.recordAuditEvent.mockClear();
  });

  it('returns default settings when a user has no stored settings', async () => {
    const response = await GET();
    const payload = (await response.json()) as GlobalSettings;

    expect(response.status).toBe(200);
    expect(payload.headerVariants.length).toBeGreaterThan(0);
    expect(payload.footerRichText.type).toBe('doc');
  });

  it('applies settings fallbacks for previous default footer content', async () => {
    const previousSettings: GlobalSettingsInput = {
      headerVariants: [],
      footerRichText: {
        type: 'doc',
        content: [
          { type: 'paragraph', content: [{ type: 'text', text: 'AGC · Newsletter' }] },
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Impressum und Datenschutz werden zentral gepflegt.' }],
          },
        ],
      },
    };
    mocks.rows = [
      {
        id: 'tenant-1',
        tenantId: 'tenant-1',
        settings: previousSettings,
        updatedAt: new Date('2026-07-16T10:00:00.000Z'),
      },
    ];

    const response = await GET();
    const payload = (await response.json()) as GlobalSettings;

    expect(response.status).toBe(200);
    expect(payload.headerVariants.length).toBeGreaterThan(0);
    expect(JSON.stringify(payload.footerRichText)).toContain('office@anglogermanclub.de');
  });

  it('validates and stores settings with PUT', async () => {
    const settings = createDefaultSettings();

    const response = await PUT(jsonRequest(settings));
    const payload = (await response.json()) as GlobalSettings;

    expect(response.status).toBe(200);
    expect(payload.headerVariants).toHaveLength(settings.headerVariants.length);
    expect(mocks.rows[0].settings).toEqual(settings);
    expect(mocks.recordAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({ actorUserId: 'user-1', tenantId: 'tenant-1', eventType: 'settings.updated' }),
    );
  });

  it('returns 400 for invalid settings payloads', async () => {
    const response = await PUT(jsonRequest({ headerVariants: [{ id: '', name: '', imageUrl: 'not-a-url', alt: '' }] }));
    const payload = await responseJson(response);

    expect(response.status).toBe(400);
    expect(payload.error).toMatchObject({ code: 'VALIDATION_ERROR' });
  });
});

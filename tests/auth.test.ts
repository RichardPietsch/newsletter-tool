import { describe, expect, it } from 'vitest';
import { consumeMagicLinkToken } from '@/lib/auth/magic-link-consumption';
import { normalizeEmail } from '@/lib/auth/config';
import { createSecureToken, hashToken } from '@/lib/auth/tokens';

type FakeMagicLinkRow = {
  id: string;
  userId: string;
  email: string;
  tokenHash: string;
  expiresAt: Date;
  consumedAt: Date | null;
};

function fakeConsumerDb(row: FakeMagicLinkRow | null) {
  return {
    update: () => ({
      set: (values: { consumedAt: Date }) => ({
        where: () => ({
          returning: async () => {
            if (!row || row.consumedAt || row.expiresAt <= values.consumedAt) return [];
            row.consumedAt = values.consumedAt;
            return [{ id: row.id, userId: row.userId, email: row.email }];
          },
        }),
      }),
    }),
  } as unknown as Parameters<typeof consumeMagicLinkToken>[2];
}

describe('passwordless auth helpers', () => {
  it('normalizes emails and creates non-plain token hashes', () => {
    const token = createSecureToken();
    expect(token.length).toBeGreaterThan(30);
    expect(hashToken(token)).not.toBe(token);
    expect(hashToken(token)).toHaveLength(64);
    expect(normalizeEmail(' Redaktion@Example.COM ')).toBe('redaktion@example.com');
  });

  it('consumes a magic-link token only once under parallel attempts', async () => {
    const token = createSecureToken();
    const tokenHash = hashToken(token);
    const now = new Date('2026-07-16T12:00:00.000Z');
    const row: FakeMagicLinkRow = {
      id: 'link-1',
      userId: 'user-1',
      email: 'user@example.test',
      tokenHash,
      expiresAt: new Date('2026-07-16T12:05:00.000Z'),
      consumedAt: null,
    };
    const db = fakeConsumerDb(row);

    const [first, second] = await Promise.all([
      consumeMagicLinkToken(tokenHash, now, db),
      consumeMagicLinkToken(tokenHash, now, db),
    ]);

    expect([first, second].filter(Boolean)).toHaveLength(1);
    expect(row.consumedAt).toEqual(now);
  });

  it('does not consume expired magic-link tokens', async () => {
    const tokenHash = hashToken(createSecureToken());
    const now = new Date('2026-07-16T12:00:00.000Z');
    const row: FakeMagicLinkRow = {
      id: 'link-1',
      userId: 'user-1',
      email: 'user@example.test',
      tokenHash,
      expiresAt: new Date('2026-07-16T11:59:00.000Z'),
      consumedAt: null,
    };

    await expect(consumeMagicLinkToken(tokenHash, now, fakeConsumerDb(row))).resolves.toBeNull();
    expect(row.consumedAt).toBeNull();
  });
});

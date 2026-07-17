import { and, eq, gt, isNull } from 'drizzle-orm';
import type { db as appDb } from '@/lib/db';
import { authMagicLinks } from '@/lib/db/schema';

type MagicLinkConsumerDb = Pick<typeof appDb, 'update'>;

export async function consumeMagicLinkToken(tokenHash: string, consumedAt: Date, client: MagicLinkConsumerDb) {
  const [row] = await client
    .update(authMagicLinks)
    .set({ consumedAt })
    .where(
      and(
        eq(authMagicLinks.tokenHash, tokenHash),
        isNull(authMagicLinks.consumedAt),
        gt(authMagicLinks.expiresAt, consumedAt),
      ),
    )
    .returning({ id: authMagicLinks.id, userId: authMagicLinks.userId });

  return row ?? null;
}

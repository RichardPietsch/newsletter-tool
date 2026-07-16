import { and, count, eq, gte } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from '@/lib/db';
import { authMagicLinks, users } from '@/lib/db/schema';
import { seedNewsletterTemplatesForUser } from '@/lib/newsletter/template-files';
import { sendEmail } from '@/lib/email/send-email';
import { magicLinkEmail } from '@/lib/email/templates/magic-link';
import { createSession } from './session';
import { isEmailAllowed, MAGIC_LINK_TTL_MINUTES, normalizeEmail } from './config';
import { serverEnv } from '@/lib/env';
import { consumeMagicLinkToken } from './magic-link-consumption';
import { createSecureToken, hashToken } from './tokens';

const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const MAX_EMAIL_REQUESTS_PER_WINDOW = 5;
const MAX_IP_REQUESTS_PER_WINDOW = 20;

export async function requestMagicLink(emailInput: string, metadata: { ip?: string | null; userAgent?: string | null } = {}) {
  const email = normalizeEmail(emailInput);
  const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MS);
  const [{ value: emailCount }] = await db
    .select({ value: count() })
    .from(authMagicLinks)
    .where(and(eq(authMagicLinks.email, email), gte(authMagicLinks.createdAt, since)));

  if (emailCount >= MAX_EMAIL_REQUESTS_PER_WINDOW || !isEmailAllowed(email)) return;

  if (metadata.ip) {
    const [{ value: ipCount }] = await db
      .select({ value: count() })
      .from(authMagicLinks)
      .where(and(eq(authMagicLinks.requestedIp, metadata.ip), gte(authMagicLinks.createdAt, since)));
    if (ipCount >= MAX_IP_REQUESTS_PER_WINDOW) return;
  }

  let [user] = await db.select().from(users).where(eq(users.email, email));
  if (!user) {
    [user] = await db.insert(users).values({ id: nanoid(), email }).returning();
    await seedNewsletterTemplatesForUser(user.id);
  }

  const token = createSecureToken();
  const expiresAt = new Date(Date.now() + MAGIC_LINK_TTL_MINUTES * 60 * 1000);
  await db.insert(authMagicLinks).values({
    id: nanoid(),
    userId: user.id,
    email,
    tokenHash: hashToken(token),
    expiresAt,
    requestedIp: metadata.ip || null,
    userAgent: metadata.userAgent || null,
  });

  const url = new URL('/auth/magic-link/verify', serverEnv.appUrl);
  url.searchParams.set('token', token);
  const message = magicLinkEmail({ url: url.toString(), ttlMinutes: MAGIC_LINK_TTL_MINUTES });
  await sendEmail({ to: email, subject: 'Dein Zugangslink zum Newsletter Tool', ...message });
}

export async function verifyMagicLink(token: string, metadata: { ip?: string | null; userAgent?: string | null } = {}) {
  const consumed = await consumeMagicLinkToken(hashToken(token), new Date(), db);
  if (!consumed) return null;

  const [user] = await db
    .update(users)
    .set({ emailVerifiedAt: new Date(), lastLoginAt: new Date(), updatedAt: new Date() })
    .where(eq(users.id, consumed.userId))
    .returning();
  const sessionToken = await createSession(consumed.userId, { ipAddress: metadata.ip, userAgent: metadata.userAgent });
  return { user, sessionToken };
}

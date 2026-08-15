export const dynamic = 'force-dynamic';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { validateMutationOrigin } from '@/lib/api/origin';
import { requireAdminApiContext } from '@/lib/auth/current-user';
import { db } from '@/lib/db';
import { createAuditEventRecord } from '@/lib/db/audit-events';
import { auditEvents, sessions } from '@/lib/db/schema';
import { requestIdFrom } from '@/lib/logging/logger';

export async function POST(request: Request) {
  const originError = validateMutationOrigin(request);
  if (originError) return originError;
  const auth = await requireAdminApiContext(request, true, true);
  if (auth.response) return auth.response;
  if (auth.context.mode === 'support' && auth.context.tenant) {
    const event = createAuditEventRecord({
      eventType: 'support.ended',
      tenantId: auth.context.tenant.id,
      actorUserId: auth.context.user.id,
      summary: 'Lesender Supportmodus beendet.',
      correlationId: requestIdFrom(request),
      entityType: 'tenant',
      entityId: auth.context.tenant.id,
    });
    await db.transaction(async (tx) => {
      await tx
        .update(sessions)
        .set({ supportTenantId: null, supportStartedAt: null })
        .where(eq(sessions.id, auth.context.sessionId));
      await tx.insert(auditEvents).values(event);
    });
  }
  return NextResponse.redirect(new URL('/admin', request.url), 303);
}

export const dynamic = 'force-dynamic';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { publicAppUrl } from '@/lib/app-url';
import { badRequest, notFound } from '@/lib/api/api-error';
import { validateMutationOrigin } from '@/lib/api/origin';
import { requireAdminApiContext } from '@/lib/auth/current-user';
import { db } from '@/lib/db';
import { createAuditEventRecord } from '@/lib/db/audit-events';
import { auditEvents, sessions, tenants } from '@/lib/db/schema';
import { requestIdFrom } from '@/lib/logging/logger';

export async function POST(request: Request) {
  const originError = validateMutationOrigin(request);
  if (originError) return originError;
  const auth = await requireAdminApiContext(request, true);
  if (auth.response) return auth.response;
  const form = await request.formData();
  const tenantId = form.get('tenantId');
  if (typeof tenantId !== 'string' || !tenantId) return badRequest('Mandant fehlt.');
  const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId));
  if (!tenant) return notFound();
  const event = createAuditEventRecord({
    eventType: 'support.started',
    tenantId,
    actorUserId: auth.context.user.id,
    summary: 'Lesender Supportmodus gestartet.',
    correlationId: requestIdFrom(request),
    entityType: 'tenant',
    entityId: tenantId,
  });
  await db.transaction(async (tx) => {
    await tx
      .update(sessions)
      .set({ supportTenantId: tenantId, supportStartedAt: event.createdAt })
      .where(eq(sessions.id, auth.context.sessionId));
    await tx.insert(auditEvents).values(event);
  });
  return NextResponse.redirect(publicAppUrl('/newsletters'), 303);
}

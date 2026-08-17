export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { publicAppUrl } from '@/lib/app-url';
import { nanoid } from 'nanoid';
import { desc, eq } from 'drizzle-orm';
import { requireTenantApiContext } from '@/lib/auth/current-user';
import { validateMutationOrigin } from '@/lib/api/origin';
import { db } from '@/lib/db';
import { newsletters } from '@/lib/db/schema';
import { createDefaultDocument } from '@/lib/newsletter/defaults';
import { recordAuditEvent } from '@/lib/db/audit-events';
import { requestIdFrom } from '@/lib/logging/logger';

export async function GET() {
  const auth = await requireTenantApiContext();
  if (auth.response) return auth.response;
  const rows = await db
    .select()
    .from(newsletters)
    .where(eq(newsletters.tenantId, auth.context.tenant.id))
    .orderBy(desc(newsletters.updatedAt));
  return NextResponse.json(rows);
}

export async function POST(request: Request) {
  const originError = validateMutationOrigin(request);
  if (originError) return originError;
  const auth = await requireTenantApiContext(request, true);
  if (auth.response) return auth.response;
  const id = nanoid();
  const document = createDefaultDocument();
  await db
    .insert(newsletters)
    .values({ id, tenantId: auth.context.tenant.id, title: document.title, document });
  await recordAuditEvent({
    eventType: 'newsletter.created',
    tenantId: auth.context.tenant.id,
    actorUserId: auth.context.user.id,
    summary: 'Neuer Newsletter gestartet.',
    correlationId: requestIdFrom(request),
    entityType: 'newsletter',
    entityId: id,
    metadata: { source: 'blank' },
  });
  return new Response(null, { status: 303, headers: { Location: publicAppUrl(`/newsletters/${id}`).toString() } });
}

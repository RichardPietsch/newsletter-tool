export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { and, eq } from 'drizzle-orm';
import { notFound } from '@/lib/api/api-error';
import { parseJson } from '@/lib/api/parse-json';
import { validateMutationOrigin } from '@/lib/api/origin';
import { requireTenantApiContext } from '@/lib/auth/current-user';
import { db } from '@/lib/db';
import { recordAuditEvent } from '@/lib/db/audit-events';
import { events } from '@/lib/db/schema';
import { eventDeleteSchema, eventInputSchema, eventUpdateSchema } from '@/lib/events/schema';

export async function GET() {
  const auth = await requireTenantApiContext();
  if (auth.response) return auth.response;
  return NextResponse.json(await db.select().from(events).where(eq(events.tenantId, auth.context.tenant.id)));
}

export async function POST(request: Request) {
  const originError = validateMutationOrigin(request);
  if (originError) return originError;
  const auth = await requireTenantApiContext(request, true);
  if (auth.response) return auth.response;
  const parsed = await parseJson(request, eventInputSchema);
  if (parsed.response) return parsed.response;

  const row = {
    id: nanoid(),
    tenantId: auth.context.tenant.id,
    ...parsed.data,
    updatedAt: new Date(),
  };
  const [created] = await db.insert(events).values(row).returning();
  await recordAuditEvent({
    actorUserId: auth.context.user.id,
    tenantId: auth.context.tenant.id,
    eventType: 'event.created',
    entityType: 'event',
    entityId: row.id,
  });
  return NextResponse.json(created, { status: 201 });
}

export async function PUT(request: Request) {
  const originError = validateMutationOrigin(request);
  if (originError) return originError;
  const auth = await requireTenantApiContext(request, true);
  if (auth.response) return auth.response;
  const parsed = await parseJson(request, eventUpdateSchema);
  if (parsed.response) return parsed.response;

  const { id, ...patch } = parsed.data;
  const [updated] = await db
    .update(events)
    .set({ ...patch, updatedAt: new Date() })
    .where(and(eq(events.id, id), eq(events.tenantId, auth.context.tenant.id)))
    .returning();
  return updated ? NextResponse.json(updated) : notFound();
}

export async function DELETE(request: Request) {
  const originError = validateMutationOrigin(request);
  if (originError) return originError;
  const auth = await requireTenantApiContext(request, true);
  if (auth.response) return auth.response;
  const parsed = await parseJson(request, eventDeleteSchema);
  if (parsed.response) return parsed.response;

  const [deleted] = await db
    .delete(events)
    .where(and(eq(events.id, parsed.data.id), eq(events.tenantId, auth.context.tenant.id)))
    .returning({ id: events.id });
  if (!deleted) return notFound();
  await recordAuditEvent({
    actorUserId: auth.context.user.id,
    tenantId: auth.context.tenant.id,
    eventType: 'event.deleted',
    entityType: 'event',
    entityId: deleted.id,
  });
  return NextResponse.json(deleted);
}

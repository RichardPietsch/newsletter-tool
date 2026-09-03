export const dynamic = 'force-dynamic';

import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { notFound } from '@/lib/api/api-error';
import { parseJson } from '@/lib/api/parse-json';
import { validateMutationOrigin } from '@/lib/api/origin';
import { requireAdminApiContext } from '@/lib/auth/current-user';
import { recordAuditEvent } from '@/lib/db/audit-events';
import { db } from '@/lib/db';
import { tenants } from '@/lib/db/schema';
import { globalSettingsSchema } from '@/lib/settings/schema';
import { saveTenantSettings } from '@/lib/settings/store';

type Context = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Context) {
  const originError = validateMutationOrigin(request);
  if (originError) return originError;
  const auth = await requireAdminApiContext(request, true);
  if (auth.response) return auth.response;
  const { id } = await params;
  const [tenant] = await db.select({ id: tenants.id }).from(tenants).where(eq(tenants.id, id));
  if (!tenant) return notFound();
  const parsed = await parseJson(request, globalSettingsSchema);
  if (parsed.response) return parsed.response;

  const settings = await saveTenantSettings(id, parsed.data);
  await recordAuditEvent({
    actorUserId: auth.context.user.id,
    tenantId: id,
    eventType: 'settings.updated',
    summary: 'Mandanten-Design durch Plattform-Administration aktualisiert.',
    entityType: 'tenant',
    entityId: id,
  });
  return NextResponse.json(settings);
}

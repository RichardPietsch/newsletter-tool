export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { parseJson } from '@/lib/api/parse-json';
import { validateMutationOrigin } from '@/lib/api/origin';
import { requireTenantApiContext } from '@/lib/auth/current-user';
import { getTenantSettings, saveTenantSettings } from '@/lib/settings/store';
import { globalSettingsSchema } from '@/lib/settings/schema';
import { recordAuditEvent } from '@/lib/db/audit-events';

export async function GET() {
  const auth = await requireTenantApiContext();
  if (auth.response) return auth.response;
  return NextResponse.json(await getTenantSettings(auth.context.tenant.id));
}

export async function PUT(request: Request) {
  const originError = validateMutationOrigin(request);
  if (originError) return originError;
  const auth = await requireTenantApiContext(request, true);
  if (auth.response) return auth.response;
  const parsed = await parseJson(request, globalSettingsSchema);
  if (parsed.response) return parsed.response;
  const settings = await saveTenantSettings(auth.context.tenant.id, parsed.data);
  await recordAuditEvent({
    actorUserId: auth.context.user.id,
    tenantId: auth.context.tenant.id,
    eventType: 'settings.updated',
    summary: 'Mandanteneinstellungen aktualisiert.',
  });
  return NextResponse.json(settings);
}

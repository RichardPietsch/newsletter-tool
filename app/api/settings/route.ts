export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { parseJson } from '@/lib/api/parse-json';
import { validateMutationOrigin } from '@/lib/api/origin';
import { requireApiUser } from '@/lib/auth/current-user';
import { getUserSettings, saveUserSettings } from '@/lib/settings/store';
import { globalSettingsSchema } from '@/lib/settings/schema';
import { recordAuditEvent } from '@/lib/db/audit-events';

export async function GET() {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;
  return NextResponse.json(await getUserSettings(auth.user.id));
}

export async function PUT(request: Request) {
  const originError = validateMutationOrigin(request);
  if (originError) return originError;
  const auth = await requireApiUser();
  if (auth.response) return auth.response;
  const parsed = await parseJson(request, globalSettingsSchema);
  if (parsed.response) return parsed.response;
  const settings = await saveUserSettings(auth.user.id, parsed.data);
  await recordAuditEvent({ userId: auth.user.id, eventType: 'settings.updated' });
  return NextResponse.json(settings);
}

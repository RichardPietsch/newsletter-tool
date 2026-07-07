import { NextResponse } from 'next/server';
import { requireApiUser } from '@/lib/auth/current-user';
import { getUserSettings, saveUserSettings } from '@/lib/settings/store';
import { globalSettingsSchema } from '@/lib/settings/schema';

export async function GET() {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;
  return NextResponse.json(await getUserSettings(auth.user.id));
}

export async function PUT(request: Request) {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;
  const body = await request.json();
  const settings = globalSettingsSchema.parse(body);
  return NextResponse.json(await saveUserSettings(auth.user.id, settings));
}

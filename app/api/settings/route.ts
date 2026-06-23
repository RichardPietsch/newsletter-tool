import { NextResponse } from 'next/server';
import { getGlobalSettings, saveGlobalSettings } from '@/lib/settings/store';
import { globalSettingsSchema } from '@/lib/settings/schema';

export async function GET() {
  return NextResponse.json(await getGlobalSettings());
}

export async function PUT(request: Request) {
  const body = await request.json();
  const settings = globalSettingsSchema.parse(body);
  return NextResponse.json(await saveGlobalSettings(settings));
}

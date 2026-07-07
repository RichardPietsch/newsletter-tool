import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { eq } from 'drizzle-orm';
import { validateAndUpload } from '@/lib/assets/upload';
import { requireApiUser } from '@/lib/auth/current-user';
import { db } from '@/lib/db';
import { assets } from '@/lib/db/schema';

export async function GET() {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;
  return NextResponse.json(await db.select().from(assets).where(eq(assets.ownerId, auth.user.id)));
}

export async function POST(req: Request) {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;
  const form = await req.formData();
  const file = form.get('file');
  if (!(file instanceof File)) return NextResponse.json({ error: 'Datei fehlt' }, { status: 400 });
  const data = await validateAndUpload(file);
  const row = { id: nanoid(), ownerId: auth.user.id, ...data };
  await db.insert(assets).values(row);
  return NextResponse.json(row);
}

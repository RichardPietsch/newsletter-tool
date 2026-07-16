export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { badRequest, notFound } from '@/lib/api/api-error';
import { parseJson } from '@/lib/api/parse-json';
import { validateAndUpload } from '@/lib/assets/upload';
import { requireApiUser } from '@/lib/auth/current-user';
import { db } from '@/lib/db';
import { assets } from '@/lib/db/schema';

const assetUpdateSchema = z.object({
  id: z.string().min(1),
  title: z.string().max(160).optional(),
  altText: z.string().max(300).optional(),
});

export async function GET() {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;
  return NextResponse.json(await db.select().from(assets).where(eq(assets.ownerId, auth.user.id)));
}

export async function POST(req: Request) {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return badRequest('Ungültige Upload-Daten.');
  }

  const file = form.get('file');
  if (!(file instanceof File)) return badRequest('Datei fehlt');
  const data = await validateAndUpload(file);
  const title = data.originalFilename.replace(/\.[^.]+$/, '') || data.originalFilename;
  const row = { id: nanoid(), ownerId: auth.user.id, title, altText: '', ...data };
  await db.insert(assets).values(row);
  return NextResponse.json(row);
}

export async function PUT(req: Request) {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;
  const parsed = await parseJson(req, assetUpdateSchema);
  if (parsed.response) return parsed.response;

  const [row] = await db
    .update(assets)
    .set({ title: parsed.data.title, altText: parsed.data.altText })
    .where(and(eq(assets.id, parsed.data.id), eq(assets.ownerId, auth.user.id)))
    .returning();

  return row ? NextResponse.json(row) : notFound();
}

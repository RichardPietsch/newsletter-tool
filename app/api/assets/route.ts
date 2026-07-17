export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { badRequest, notFound } from '@/lib/api/api-error';
import { parseJson } from '@/lib/api/parse-json';
import { validateMutationOrigin } from '@/lib/api/origin';
import { UploadValidationError, validateAndUpload } from '@/lib/assets/upload';
import { requireApiUser } from '@/lib/auth/current-user';
import { db } from '@/lib/db';
import { assets } from '@/lib/db/schema';
import { logger, requestIdFrom } from '@/lib/logging/logger';

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
  const requestId = requestIdFrom(req);
  const originError = validateMutationOrigin(req);
  if (originError) return originError;
  const auth = await requireApiUser();
  if (auth.response) return auth.response;

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    logger.warn({ event: 'asset.upload.rejected', requestId, userId: auth.user.id }, { reason: 'invalid_form_data' });
    return badRequest('Ungültige Upload-Daten.');
  }

  const file = form.get('file');
  if (!(file instanceof File)) {
    logger.warn({ event: 'asset.upload.rejected', requestId, userId: auth.user.id }, { reason: 'missing_file' });
    return badRequest('Datei fehlt');
  }
  let data: Awaited<ReturnType<typeof validateAndUpload>>;
  try {
    data = await validateAndUpload(file);
  } catch (error) {
    if (error instanceof UploadValidationError) {
      logger.warn({ event: 'asset.upload.rejected', requestId, userId: auth.user.id }, { reason: error.code });
      return badRequest(error.message);
    }
    throw error;
  }
  const title = data.originalFilename.replace(/\.[^.]+$/, '') || data.originalFilename;
  const row = { id: nanoid(), ownerId: auth.user.id, title, altText: '', ...data };
  await db.insert(assets).values(row);
  logger.info(
    { event: 'asset.upload.completed', requestId, userId: auth.user.id },
    { assetId: row.id, bytes: data.sizeBytes, mimeType: data.mimeType },
  );
  return NextResponse.json(row);
}

export async function PUT(req: Request) {
  const originError = validateMutationOrigin(req);
  if (originError) return originError;
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

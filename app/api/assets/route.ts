export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { badRequest, notFound } from '@/lib/api/api-error';
import { parseJson } from '@/lib/api/parse-json';
import { validateMutationOrigin } from '@/lib/api/origin';
import { UploadValidationError, validateAndUpload } from '@/lib/assets/upload';
import { requireTenantApiContext } from '@/lib/auth/current-user';
import { db } from '@/lib/db';
import { assets } from '@/lib/db/schema';
import { logger, requestIdFrom } from '@/lib/logging/logger';
import { recordAuditEvent } from '@/lib/db/audit-events';

const assetUpdateSchema = z.object({
  id: z.string().min(1),
  title: z.string().max(160).optional(),
  altText: z.string().max(300).optional(),
});

export async function GET() {
  const auth = await requireTenantApiContext();
  if (auth.response) return auth.response;
  return NextResponse.json(await db.select().from(assets).where(eq(assets.tenantId, auth.context.tenant.id)));
}

export async function POST(req: Request) {
  const requestId = requestIdFrom(req);
  const originError = validateMutationOrigin(req);
  if (originError) return originError;
  const auth = await requireTenantApiContext(req, true);
  if (auth.response) return auth.response;

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    logger.warn(
      { event: 'asset.upload.rejected', requestId, userId: auth.context.user.id, tenantId: auth.context.tenant.id },
      { reason: 'invalid_form_data' },
    );
    return badRequest('Ungültige Upload-Daten.');
  }

  const file = form.get('file');
  if (!(file instanceof File)) {
    logger.warn(
      { event: 'asset.upload.rejected', requestId, userId: auth.context.user.id, tenantId: auth.context.tenant.id },
      { reason: 'missing_file' },
    );
    return badRequest('Datei fehlt');
  }
  let data: Awaited<ReturnType<typeof validateAndUpload>>;
  try {
    data = await validateAndUpload(file, undefined, auth.context.tenant.id);
  } catch (error) {
    if (error instanceof UploadValidationError) {
      logger.warn(
        { event: 'asset.upload.rejected', requestId, userId: auth.context.user.id, tenantId: auth.context.tenant.id },
        { reason: error.code },
      );
      return badRequest(error.message);
    }
    throw error;
  }
  const title = data.originalFilename.replace(/\.[^.]+$/, '') || data.originalFilename;
  const row = { id: nanoid(), tenantId: auth.context.tenant.id, title, altText: '', ...data };
  await db.insert(assets).values(row);
  await recordAuditEvent({
    actorUserId: auth.context.user.id,
    tenantId: auth.context.tenant.id,
    eventType: 'asset.uploaded',
    entityType: 'asset',
    entityId: row.id,
    correlationId: requestId,
  });
  logger.info(
    {
      event: 'asset.upload.completed',
      requestId,
      userId: auth.context.user.id,
      tenantId: auth.context.tenant.id,
    },
    { assetId: row.id, bytes: data.sizeBytes, mimeType: data.mimeType },
  );
  return NextResponse.json(row);
}

export async function PUT(req: Request) {
  const originError = validateMutationOrigin(req);
  if (originError) return originError;
  const auth = await requireTenantApiContext(req, true);
  if (auth.response) return auth.response;
  const parsed = await parseJson(req, assetUpdateSchema);
  if (parsed.response) return parsed.response;

  const [row] = await db
    .update(assets)
    .set({ title: parsed.data.title, altText: parsed.data.altText })
    .where(and(eq(assets.id, parsed.data.id), eq(assets.tenantId, auth.context.tenant.id)))
    .returning();

  return row ? NextResponse.json(row) : notFound();
}

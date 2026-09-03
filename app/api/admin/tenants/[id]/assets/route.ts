export const dynamic = 'force-dynamic';

import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { NextResponse } from 'next/server';
import { badRequest, notFound } from '@/lib/api/api-error';
import { validateMutationOrigin } from '@/lib/api/origin';
import { validateAndUpload, UploadValidationError } from '@/lib/assets/upload';
import { requireAdminApiContext } from '@/lib/auth/current-user';
import { db } from '@/lib/db';
import { recordAuditEvent } from '@/lib/db/audit-events';
import { assets, tenants } from '@/lib/db/schema';
import { logger, requestIdFrom } from '@/lib/logging/logger';

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Context) {
  const requestId = requestIdFrom(request);
  const originError = validateMutationOrigin(request);
  if (originError) return originError;
  const auth = await requireAdminApiContext(request, true);
  if (auth.response) return auth.response;
  const { id: tenantId } = await params;
  const [tenant] = await db.select({ id: tenants.id }).from(tenants).where(eq(tenants.id, tenantId));
  if (!tenant) return notFound();

  const form = await request.formData();
  const file = form.get('file');
  if (!(file instanceof File)) return badRequest('Datei fehlt');

  let uploaded: Awaited<ReturnType<typeof validateAndUpload>>;
  try {
    uploaded = await validateAndUpload(file, undefined, tenantId);
  } catch (error) {
    if (error instanceof UploadValidationError) return badRequest(error.message);
    throw error;
  }

  const row = {
    id: nanoid(),
    tenantId,
    title: uploaded.originalFilename.replace(/\.[^.]+$/, '') || uploaded.originalFilename,
    altText: '',
    ...uploaded,
  };
  await db.insert(assets).values(row);
  await recordAuditEvent({
    actorUserId: auth.context.user.id,
    tenantId,
    eventType: 'asset.uploaded',
    entityType: 'asset',
    entityId: row.id,
    correlationId: requestId,
  });
  logger.info(
    { event: 'admin.tenant_asset.uploaded', requestId, userId: auth.context.user.id, tenantId },
    { assetId: row.id },
  );
  return NextResponse.json(row, { status: 201 });
}

export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { renderNewsletter, safeFilename } from '@/email/render-newsletter';
import { forbidden, notFound, validationError } from '@/lib/api/api-error';
import { requireTenantApiContext } from '@/lib/auth/current-user';
import { db } from '@/lib/db';
import { serverEnv } from '@/lib/env';
import { newsletters } from '@/lib/db/schema';
import { validateNewsletterForExport } from '@/lib/newsletter/export-validation';
import { serializeNewsletterTemplate } from '@/lib/newsletter/template-files';
import { safeMigrateNewsletterDocument } from '@/lib/newsletter/migrations';
import { getTenantSettings } from '@/lib/settings/store';
import { logger, requestIdFrom } from '@/lib/logging/logger';
import { recordAuditEvent } from '@/lib/db/audit-events';

type NewsletterExportRouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, { params }: NewsletterExportRouteContext) {
  const auth = await requireTenantApiContext();
  if (auth.response) return auth.response;
  const { id } = await params;
  const logContext = {
    event: 'newsletter.export.requested',
    requestId: requestIdFrom(request),
    userId: auth.context.user.id,
    tenantId: auth.context.tenant.id,
    newsletterId: id,
  };
  logger.info(logContext);
  const [newsletter] = await db
    .select()
    .from(newsletters)
    .where(and(eq(newsletters.id, id), eq(newsletters.tenantId, auth.context.tenant.id)));

  if (!newsletter) {
    logger.warn({ ...logContext, event: 'newsletter.export.not_found' });
    return notFound();
  }

  const migratedDocument = safeMigrateNewsletterDocument(newsletter.document);
  if (!migratedDocument.success)
    return validationError('Gespeicherter Newsletter ist ungültig.', [
      { code: migratedDocument.error.code, message: migratedDocument.error.message, path: ['document'] },
    ]);
  const document = migratedDocument.data;
  const format = request.nextUrl.searchParams.get('format');

  if (format === 'yml') {
    if (serverEnv.isProduction) {
      return forbidden('YML-Template-Export ist nur in der lokalen Entwicklungsumgebung verfügbar.');
    }

    const yml = serializeNewsletterTemplate({
      title: newsletter.title,
      createdAt: newsletter.createdAt.toISOString(),
      updatedAt: newsletter.updatedAt.toISOString(),
      document,
    });
    logger.info({ ...logContext, event: 'newsletter.export.completed' }, { format: 'yml' });
    await recordAuditEvent({
      actorUserId: auth.context.user.id,
      tenantId: auth.context.tenant.id,
      eventType: 'newsletter.exported',
      entityType: 'newsletter',
      entityId: id,
      correlationId: logContext.requestId,
    });

    return new NextResponse(yml, {
      headers: {
        'content-type': 'application/x-yaml; charset=utf-8',
        'content-disposition': `attachment; filename="${safeFilename(document.title).replace(/\.html$/i, '')}.yml"`,
      },
    });
  }

  const issues = validateNewsletterForExport(document);
  if (issues.length > 0) {
    logger.warn({ ...logContext, event: 'newsletter.export.validation_failed' }, { issueCount: issues.length });
    return validationError('Newsletter kann nicht exportiert werden.', issues);
  }

  const settings = await getTenantSettings(auth.context.tenant.id);
  const html = renderNewsletter(document, settings);
  const exportHtml = `<!--email_off-->${html}<!--/email_off-->`;
  logger.info({ ...logContext, event: 'newsletter.export.completed' }, { format: 'html' });
  await recordAuditEvent({
    actorUserId: auth.context.user.id,
    tenantId: auth.context.tenant.id,
    eventType: 'newsletter.exported',
    entityType: 'newsletter',
    entityId: id,
    correlationId: logContext.requestId,
  });

  return new NextResponse(exportHtml, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'content-disposition': `attachment; filename="${safeFilename(document.title)}"`,
      'cache-control': 'private, no-store, no-transform',
    },
  });
}

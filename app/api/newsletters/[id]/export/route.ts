import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { renderNewsletter, safeFilename } from '@/email/render-newsletter';
import { requireApiUser } from '@/lib/auth/current-user';
import { db } from '@/lib/db';
import { newsletters } from '@/lib/db/schema';
import { newsletterDocumentSchema } from '@/lib/newsletter/schema';
import { getUserSettings } from '@/lib/settings/store';

type NewsletterExportRouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_: Request, { params }: NewsletterExportRouteContext) {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;
  const { id } = await params;
  const [newsletter] = await db
    .select()
    .from(newsletters)
    .where(and(eq(newsletters.id, id), eq(newsletters.ownerId, auth.user.id)));

  if (!newsletter) {
    return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });
  }

  const document = newsletterDocumentSchema.parse(newsletter.document);
  const settings = await getUserSettings(auth.user.id);
  const html = renderNewsletter(document, settings);

  return new NextResponse(html, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'content-disposition': `attachment; filename="${safeFilename(document.title)}"`,
    },
  });
}

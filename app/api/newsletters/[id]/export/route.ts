import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { renderNewsletter, safeFilename } from '@/email/render-newsletter';
import { db } from '@/lib/db';
import { newsletters } from '@/lib/db/schema';
import { newsletterDocumentSchema } from '@/lib/newsletter/schema';

type NewsletterExportRouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_: Request, { params }: NewsletterExportRouteContext) {
  const { id } = await params;
  const [newsletter] = await db.select().from(newsletters).where(eq(newsletters.id, id));

  if (!newsletter) {
    return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });
  }

  const document = newsletterDocumentSchema.parse(newsletter.document);
  const html = renderNewsletter(document);

  return new NextResponse(html, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'content-disposition': `attachment; filename="${safeFilename(document.title)}"`,
    },
  });
}

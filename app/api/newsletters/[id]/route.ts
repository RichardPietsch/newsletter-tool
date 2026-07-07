import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { newsletters } from '@/lib/db/schema';
import { newsletterDocumentSchema } from '@/lib/newsletter/schema';

type NewsletterRouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_: Request, { params }: NewsletterRouteContext) {
  const { id } = await params;
  const [newsletter] = await db.select().from(newsletters).where(eq(newsletters.id, id));
  return newsletter ? NextResponse.json(newsletter) : NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });
}

export async function PUT(request: Request, { params }: NewsletterRouteContext) {
  const { id } = await params;
  const body = await request.json();
  const document = newsletterDocumentSchema.parse(body.document);
  const [newsletter] = await db
    .update(newsletters)
    .set({ title: body.title || document.title, document, updatedAt: new Date() })
    .where(eq(newsletters.id, id))
    .returning();

  return newsletter ? NextResponse.json(newsletter) : NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });
}

export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { requireApiUser } from '@/lib/auth/current-user';
import { db } from '@/lib/db';
import { newsletters } from '@/lib/db/schema';
import { newsletterDocumentSchema } from '@/lib/newsletter/schema';

type NewsletterRouteContext = {
  params: Promise<{ id: string }>;
};

const patchSchema = z.object({
  title: z.string().trim().min(1).optional(),
  sent: z.boolean().optional(),
});

export async function GET(_: Request, { params }: NewsletterRouteContext) {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;
  const { id } = await params;
  const [newsletter] = await db
    .select()
    .from(newsletters)
    .where(and(eq(newsletters.id, id), eq(newsletters.ownerId, auth.user.id)));
  return newsletter ? NextResponse.json(newsletter) : NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });
}

export async function PUT(request: Request, { params }: NewsletterRouteContext) {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;
  const { id } = await params;
  const [current] = await db.select().from(newsletters).where(and(eq(newsletters.id, id), eq(newsletters.ownerId, auth.user.id)));
  if (!current) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });
  if (current.sentAt) return NextResponse.json({ error: 'Versendete Newsletter können nicht mehr bearbeitet werden.' }, { status: 409 });

  const body = await request.json();
  const document = newsletterDocumentSchema.parse(body.document);
  const [newsletter] = await db
    .update(newsletters)
    .set({ title: body.title || document.title, document, updatedAt: new Date() })
    .where(and(eq(newsletters.id, id), eq(newsletters.ownerId, auth.user.id)))
    .returning();

  return newsletter ? NextResponse.json(newsletter) : NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });
}

export async function PATCH(request: Request, { params }: NewsletterRouteContext) {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;
  const { id } = await params;
  const patch = patchSchema.parse(await request.json());
  const [current] = await db.select().from(newsletters).where(and(eq(newsletters.id, id), eq(newsletters.ownerId, auth.user.id)));
  if (!current) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });
  if (current.sentAt && patch.title) return NextResponse.json({ error: 'Versendete Newsletter können nicht umbenannt werden.' }, { status: 409 });

  const sentAt = patch.sent === true ? (current.sentAt ?? new Date()) : patch.sent === false ? null : current.sentAt;
  const [newsletter] = await db
    .update(newsletters)
    .set({ title: patch.title ?? current.title, sentAt, updatedAt: new Date() })
    .where(and(eq(newsletters.id, id), eq(newsletters.ownerId, auth.user.id)))
    .returning();

  const responseSentAt = newsletter.sentAt instanceof Date ? newsletter.sentAt.toISOString() : newsletter.sentAt;
  return NextResponse.json({ ...newsletter, sentAt: responseSentAt });
}

export async function DELETE(_: Request, { params }: NewsletterRouteContext) {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;
  const { id } = await params;
  const [newsletter] = await db
    .delete(newsletters)
    .where(and(eq(newsletters.id, id), eq(newsletters.ownerId, auth.user.id)))
    .returning({ id: newsletters.id });
  return newsletter ? NextResponse.json({ ok: true }) : NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });
}


function cloneDocumentWithFreshIds(document: unknown) {
  const cloned = newsletterDocumentSchema.parse(document);
  return {
    ...cloned,
    title: `Kopie von ${cloned.title}`,
    blocks: cloned.blocks.map((block) => ({
      ...block,
      id: nanoid(),
      ...(block.type === 'eventGrid' ? { items: block.items.map((item) => ({ ...item, id: nanoid() })) } : {}),
    })),
  };
}

export async function POST(_: Request, { params }: NewsletterRouteContext) {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;
  const { id } = await params;
  const [current] = await db.select().from(newsletters).where(and(eq(newsletters.id, id), eq(newsletters.ownerId, auth.user.id)));
  if (!current) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });

  const clonedDocument = cloneDocumentWithFreshIds(current.document);
  const cloneId = nanoid();
  const [newsletter] = await db
    .insert(newsletters)
    .values({ id: cloneId, ownerId: auth.user.id, title: clonedDocument.title, document: clonedDocument })
    .returning();

  return NextResponse.json({ ...newsletter, location: `/newsletters/${cloneId}` }, { status: 201 });
}

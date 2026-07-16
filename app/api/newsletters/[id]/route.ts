export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { conflict, notFound, validationError, zodIssues } from '@/lib/api/api-error';
import { parseJson } from '@/lib/api/parse-json';
import { validateMutationOrigin } from '@/lib/api/origin';
import { requireApiUser } from '@/lib/auth/current-user';
import { db } from '@/lib/db';
import { newsletters } from '@/lib/db/schema';
import { newsletterDocumentSchema, type NewsletterDocument } from '@/lib/newsletter/schema';

type NewsletterRouteContext = {
  params: Promise<{ id: string }>;
};

const putSchema = z.object({
  title: z.string().trim().min(1).optional(),
  document: newsletterDocumentSchema,
});

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
  return newsletter ? NextResponse.json(newsletter) : notFound();
}

export async function PUT(request: Request, { params }: NewsletterRouteContext) {
  const originError = validateMutationOrigin(request);
  if (originError) return originError;
  const auth = await requireApiUser();
  if (auth.response) return auth.response;
  const { id } = await params;
  const [current] = await db
    .select()
    .from(newsletters)
    .where(and(eq(newsletters.id, id), eq(newsletters.ownerId, auth.user.id)));
  if (!current) return notFound();
  if (current.sentAt) return conflict('Versendete Newsletter können nicht mehr bearbeitet werden.');

  const parsed = await parseJson(request, putSchema);
  if (parsed.response) return parsed.response;

  const [newsletter] = await db
    .update(newsletters)
    .set({
      title: parsed.data.title || parsed.data.document.title,
      document: parsed.data.document,
      updatedAt: new Date(),
    })
    .where(and(eq(newsletters.id, id), eq(newsletters.ownerId, auth.user.id)))
    .returning();

  return newsletter ? NextResponse.json(newsletter) : notFound();
}

export async function PATCH(request: Request, { params }: NewsletterRouteContext) {
  const originError = validateMutationOrigin(request);
  if (originError) return originError;
  const auth = await requireApiUser();
  if (auth.response) return auth.response;
  const { id } = await params;
  const parsed = await parseJson(request, patchSchema);
  if (parsed.response) return parsed.response;
  const patch = parsed.data;
  const [current] = await db
    .select()
    .from(newsletters)
    .where(and(eq(newsletters.id, id), eq(newsletters.ownerId, auth.user.id)));
  if (!current) return notFound();
  if (current.sentAt && patch.title) return conflict('Versendete Newsletter können nicht umbenannt werden.');

  const sentAt = patch.sent === true ? (current.sentAt ?? new Date()) : patch.sent === false ? null : current.sentAt;
  const [newsletter] = await db
    .update(newsletters)
    .set({ title: patch.title ?? current.title, sentAt, updatedAt: new Date() })
    .where(and(eq(newsletters.id, id), eq(newsletters.ownerId, auth.user.id)))
    .returning();

  const responseSentAt = newsletter.sentAt instanceof Date ? newsletter.sentAt.toISOString() : newsletter.sentAt;
  return NextResponse.json({ ...newsletter, sentAt: responseSentAt });
}

export async function DELETE(request: Request, { params }: NewsletterRouteContext) {
  const originError = validateMutationOrigin(request);
  if (originError) return originError;
  const auth = await requireApiUser();
  if (auth.response) return auth.response;
  const { id } = await params;
  const [newsletter] = await db
    .delete(newsletters)
    .where(and(eq(newsletters.id, id), eq(newsletters.ownerId, auth.user.id)))
    .returning({ id: newsletters.id });
  return newsletter ? NextResponse.json({ ok: true }) : notFound();
}

function cloneDocumentWithFreshIds(document: NewsletterDocument) {
  return {
    ...document,
    title: `Kopie von ${document.title}`,
    blocks: document.blocks.map((block) => ({
      ...block,
      id: nanoid(),
      ...(block.type === 'eventGrid' ? { items: block.items.map((item) => ({ ...item, id: nanoid() })) } : {}),
    })),
  };
}

export async function POST(request: Request, { params }: NewsletterRouteContext) {
  const originError = validateMutationOrigin(request);
  if (originError) return originError;
  const auth = await requireApiUser();
  if (auth.response) return auth.response;
  const { id } = await params;
  const [current] = await db
    .select()
    .from(newsletters)
    .where(and(eq(newsletters.id, id), eq(newsletters.ownerId, auth.user.id)));
  if (!current) return notFound();

  const parsedDocument = newsletterDocumentSchema.safeParse(current.document);
  if (!parsedDocument.success)
    return validationError('Gespeicherter Newsletter ist ungültig.', zodIssues(parsedDocument.error.issues));

  const clonedDocument = cloneDocumentWithFreshIds(parsedDocument.data);
  const cloneId = nanoid();
  const [newsletter] = await db
    .insert(newsletters)
    .values({ id: cloneId, ownerId: auth.user.id, title: clonedDocument.title, document: clonedDocument })
    .returning();

  return NextResponse.json({ ...newsletter, location: `/newsletters/${cloneId}` }, { status: 201 });
}

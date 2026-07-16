export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { desc, eq } from 'drizzle-orm';
import { requireApiUser } from '@/lib/auth/current-user';
import { validateMutationOrigin } from '@/lib/api/origin';
import { db } from '@/lib/db';
import { newsletters } from '@/lib/db/schema';
import { createDefaultDocument } from '@/lib/newsletter/defaults';

export async function GET() {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;
  const rows = await db.select().from(newsletters).where(eq(newsletters.ownerId, auth.user.id)).orderBy(desc(newsletters.updatedAt));
  return NextResponse.json(rows);
}

export async function POST(request: Request) {
  const originError = validateMutationOrigin(request);
  if (originError) return originError;
  const auth = await requireApiUser();
  if (auth.response) return auth.response;
  const id = nanoid();
  const document = createDefaultDocument();
  await db.insert(newsletters).values({ id, ownerId: auth.user.id, title: document.title, document });
  return new Response(null, { status: 303, headers: { Location: `/newsletters/${id}` } });
}

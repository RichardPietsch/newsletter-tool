import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { db, DEFAULT_USER_ID } from '@/lib/db';
import { newsletters, users } from '@/lib/db/schema';
import { createDefaultDocument } from '@/lib/newsletter/defaults';
import { desc } from 'drizzle-orm';

export async function GET() {
  const rows = await db.select().from(newsletters).orderBy(desc(newsletters.updatedAt));
  return NextResponse.json(rows);
}

export async function POST(request: Request) {
  await db.insert(users).values({ id: DEFAULT_USER_ID, email: 'local@example.test' }).onConflictDoNothing();
  const id = nanoid();
  const document = createDefaultDocument();
  await db.insert(newsletters).values({ id, ownerId: DEFAULT_USER_ID, title: document.title, document });
  return NextResponse.redirect(new URL(`/newsletters/${id}`, request.url), 303);
}

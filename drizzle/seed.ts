import { db, DEFAULT_USER_ID } from '@/lib/db'; import { users } from '@/lib/db/schema'; import { sql } from 'drizzle-orm';
await db.insert(users).values({id:DEFAULT_USER_ID,email:'local@example.test'}).onConflictDoUpdate({target:users.id,set:{updatedAt:sql`now()`}}); process.exit(0);

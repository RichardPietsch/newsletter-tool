import { count, eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db, pool } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { normalizeEmail } from '@/lib/auth/config';

function argument(name: string) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1]?.trim() : undefined;
}

async function main() {
  const email = argument('email');
  const name = argument('name');
  if (!email || !name || !email.includes('@')) {
    throw new Error('Usage: pnpm admin:bootstrap --email admin@example.com --name "Admin Name"');
  }
  const [{ value }] = await db.select({ value: count() }).from(users).where(eq(users.role, 'platform_admin'));
  if (value > 0) throw new Error('A platform administrator already exists.');
  await db.insert(users).values({
    id: nanoid(),
    tenantId: null,
    role: 'platform_admin',
    status: 'active',
    email: normalizeEmail(email),
    name,
  });
  console.log(`Platform administrator created for ${normalizeEmail(email)}. No link or session was generated.`);
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : 'Admin bootstrap failed.');
    process.exitCode = 1;
  })
  .finally(() => pool.end());

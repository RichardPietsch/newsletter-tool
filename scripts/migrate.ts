import path from 'node:path';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { db, pool } from '@/lib/db';

async function main() {
  await migrate(db, { migrationsFolder: path.join(process.cwd(), 'drizzle') });
}

main()
  .catch((error: unknown) => {
    console.error('Database migration failed.', error instanceof Error ? error.message : 'Unknown error');
    process.exitCode = 1;
  })
  .finally(() => pool.end());

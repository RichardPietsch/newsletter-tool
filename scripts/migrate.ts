import path from 'node:path';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { db, pool } from '@/lib/db';
import { ensureTenantSettingsPersistence } from '@/lib/settings/store';

async function main() {
  await migrate(db, { migrationsFolder: path.join(process.cwd(), 'drizzle') });
  const settings = await ensureTenantSettingsPersistence();
  console.log(
    `Tenant design persistence verified. Total: ${settings.total}; created: ${settings.created}; upgraded: ${settings.upgraded}.`,
  );
}

main()
  .catch((error: unknown) => {
    console.error('Database migration failed.', error instanceof Error ? error.message : 'Unknown error');
    process.exitCode = 1;
  })
  .finally(() => pool.end());

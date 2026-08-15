import { eq } from 'drizzle-orm';
import { db, DEFAULT_USER_ID, pool } from '@/lib/db';
import { tenants, users } from '@/lib/db/schema';
import { serverEnv } from '@/lib/env';
import { seedNewsletterTemplatesForTenant } from '@/lib/newsletter/template-files';

const DEVELOPMENT_TENANT_ID = 'development-tenant';

async function main() {
  if (serverEnv.isProduction) throw new Error('Development seed is disabled in production.');
  await db
    .insert(tenants)
    .values({ id: DEVELOPMENT_TENANT_ID, name: 'Entwicklungsmandant', status: 'active' })
    .onConflictDoNothing();
  await db
    .insert(users)
    .values({
      id: DEFAULT_USER_ID,
      tenantId: DEVELOPMENT_TENANT_ID,
      role: 'tenant_member',
      status: 'active',
      email: (process.env.DEV_SEED_EMAIL || 'local@example.test').trim().toLowerCase(),
      name: 'Lokaler Tester',
    })
    .onConflictDoUpdate({
      target: users.id,
      set: { tenantId: DEVELOPMENT_TENANT_ID, role: 'tenant_member', status: 'active', updatedAt: new Date() },
    });
  await seedNewsletterTemplatesForTenant(DEVELOPMENT_TENANT_ID);
  const [tenant] = await db.select().from(tenants).where(eq(tenants.id, DEVELOPMENT_TENANT_ID));
  if (!tenant) throw new Error('Development tenant seed failed.');
}

main().finally(() => pool.end());

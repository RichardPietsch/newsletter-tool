import { eq } from 'drizzle-orm';
import { db, DEFAULT_USER_ID, pool } from '@/lib/db';
import { appSettings, tenants, users } from '@/lib/db/schema';
import { serverEnv } from '@/lib/env';
import { seedNewsletterTemplatesForTenant } from '@/lib/newsletter/template-files';
import { normalizeEmail } from '@/lib/auth/config';
import { createDefaultSettings } from '@/lib/settings/defaults';
import { serializeTenantSettings } from '@/lib/settings/persistence';

const DEVELOPMENT_TENANT_ID = 'development-tenant';
const DEVELOPMENT_ADMIN_ID = 'development-platform-admin';

async function main() {
  if (serverEnv.isProduction) throw new Error('Development seed is disabled in production.');
  const memberEmail = normalizeEmail(process.env.DEV_SEED_EMAIL || 'local@example.test');
  const adminEmail = normalizeEmail(process.env.DEV_ADMIN_EMAIL || 'admin@example.test');
  const adminName = process.env.DEV_ADMIN_NAME?.trim() || 'Lokaler Plattform-Admin';
  if (!memberEmail.includes('@') || !adminEmail.includes('@')) {
    throw new Error('Development seed email addresses must be valid.');
  }
  if (memberEmail === adminEmail) {
    throw new Error('DEV_SEED_EMAIL and DEV_ADMIN_EMAIL must be different.');
  }

  await db
    .insert(tenants)
    .values({ id: DEVELOPMENT_TENANT_ID, name: 'Entwicklungsmandant', status: 'active' })
    .onConflictDoNothing();
  await db
    .insert(appSettings)
    .values({
      id: DEVELOPMENT_TENANT_ID,
      tenantId: DEVELOPMENT_TENANT_ID,
      settings: serializeTenantSettings(createDefaultSettings()),
    })
    .onConflictDoNothing({ target: appSettings.tenantId });
  await db
    .insert(users)
    .values({
      id: DEFAULT_USER_ID,
      tenantId: DEVELOPMENT_TENANT_ID,
      role: 'tenant_member',
      status: 'active',
      email: memberEmail,
      name: 'Lokaler Tester',
    })
    .onConflictDoUpdate({
      target: users.id,
      set: { tenantId: DEVELOPMENT_TENANT_ID, role: 'tenant_member', status: 'active', updatedAt: new Date() },
    });

  await db
    .insert(users)
    .values({
      id: DEVELOPMENT_ADMIN_ID,
      tenantId: null,
      role: 'platform_admin',
      status: 'active',
      email: adminEmail,
      name: adminName,
    })
    .onConflictDoNothing();

  const [admin] = await db.select().from(users).where(eq(users.role, 'platform_admin'));
  if (!admin) {
    throw new Error('Development admin seed failed, likely because the configured email is already in use.');
  }
  let resolvedAdminEmail = admin.email;
  if (admin.id === DEVELOPMENT_ADMIN_ID) {
    await db
      .update(users)
      .set({ email: adminEmail, name: adminName, status: 'active', updatedAt: new Date() })
      .where(eq(users.id, DEVELOPMENT_ADMIN_ID));
    resolvedAdminEmail = adminEmail;
  }

  await seedNewsletterTemplatesForTenant(DEVELOPMENT_TENANT_ID);
  const [tenant] = await db.select().from(tenants).where(eq(tenants.id, DEVELOPMENT_TENANT_ID));
  if (!tenant) throw new Error('Development tenant seed failed.');
  console.log(`Development accounts ready. Member: ${memberEmail}; admin: ${resolvedAdminEmail}`);
}

main().finally(() => pool.end());

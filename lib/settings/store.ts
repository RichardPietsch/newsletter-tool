import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { appSettings, tenants } from '@/lib/db/schema';
import { createDefaultSettings } from './defaults';
import {
  isCurrentPersistedTenantSettings,
  resolvePersistedTenantSettings,
  serializeTenantSettings,
  tenantSettingsPersistenceUpgrade,
} from './persistence';
import { globalSettingsSchema, type GlobalSettings, type GlobalSettingsInput } from './schema';

export async function getTenantSettings(tenantId: string): Promise<GlobalSettings> {
  const [row] = await db.select().from(appSettings).where(eq(appSettings.tenantId, tenantId));
  if (!row) return createDefaultSettings();
  return resolvePersistedTenantSettings(row.settings);
}

export async function saveTenantSettings(tenantId: string, settings: GlobalSettingsInput): Promise<GlobalSettings> {
  const parsed = globalSettingsSchema.parse(settings);
  const persisted = serializeTenantSettings(parsed);
  await db
    .insert(appSettings)
    .values({ id: tenantId, tenantId, settings: persisted, updatedAt: new Date() })
    .onConflictDoUpdate({ target: appSettings.tenantId, set: { settings: persisted, updatedAt: new Date() } });
  return parsed;
}

export async function ensureTenantSettingsPersistence() {
  const [tenantRows, settingRows] = await Promise.all([
    db.select({ id: tenants.id }).from(tenants),
    db.select().from(appSettings),
  ]);
  const settingsByTenant = new Map(settingRows.map((row) => [row.tenantId, row]));
  let created = 0;
  let upgraded = 0;

  for (const tenant of tenantRows) {
    const existing = settingsByTenant.get(tenant.id);
    if (!existing) {
      const persisted = tenantSettingsPersistenceUpgrade(undefined);
      if (!persisted) continue;
      const inserted = await db
        .insert(appSettings)
        .values({
          id: tenant.id,
          tenantId: tenant.id,
          settings: persisted,
          updatedAt: new Date(),
        })
        .onConflictDoNothing({ target: appSettings.tenantId })
        .returning({ tenantId: appSettings.tenantId });
      created += inserted.length;
      continue;
    }

    const persisted = tenantSettingsPersistenceUpgrade(existing.settings);
    if (!persisted) continue;
    const updated = await db
      .update(appSettings)
      .set({ settings: persisted, updatedAt: new Date() })
      .where(and(eq(appSettings.tenantId, tenant.id), eq(appSettings.updatedAt, existing.updatedAt)))
      .returning({ tenantId: appSettings.tenantId });
    upgraded += updated.length;
  }

  const verifiedRows = await db
    .select({ tenantId: appSettings.tenantId, settings: appSettings.settings })
    .from(appSettings);
  const verifiedTenantIds = new Set(
    verifiedRows.filter((row) => isCurrentPersistedTenantSettings(row.settings)).map((row) => row.tenantId),
  );
  const incomplete = tenantRows.filter((tenant) => !verifiedTenantIds.has(tenant.id));
  if (incomplete.length > 0) {
    throw new Error(`Tenant design persistence validation failed for ${incomplete.length} tenant(s).`);
  }

  return { created, upgraded, total: tenantRows.length };
}

/** Compatibility aliases; callers must pass a server-derived tenant ID. */
export const getUserSettings = getTenantSettings;
export const saveUserSettings = saveTenantSettings;

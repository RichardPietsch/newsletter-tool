import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { appSettings } from '@/lib/db/schema';
import { applyDefaultSettingsFallbacks, createDefaultSettings } from './defaults';
import { globalSettingsSchema, type GlobalSettings } from './schema';

export async function getTenantSettings(tenantId: string): Promise<GlobalSettings> {
  const [row] = await db.select().from(appSettings).where(eq(appSettings.tenantId, tenantId));
  if (!row) return createDefaultSettings();
  return applyDefaultSettingsFallbacks(globalSettingsSchema.parse(row.settings));
}

export async function saveTenantSettings(tenantId: string, settings: GlobalSettings): Promise<GlobalSettings> {
  const parsed = globalSettingsSchema.parse(settings);
  await db
    .insert(appSettings)
    .values({ id: tenantId, tenantId, settings: parsed, updatedAt: new Date() })
    .onConflictDoUpdate({ target: appSettings.tenantId, set: { settings: parsed, updatedAt: new Date() } });
  return parsed;
}

/** Compatibility aliases; callers must pass a server-derived tenant ID. */
export const getUserSettings = getTenantSettings;
export const saveUserSettings = saveTenantSettings;

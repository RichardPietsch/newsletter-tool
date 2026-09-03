import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { appSettings } from '@/lib/db/schema';
import { applyDefaultSettingsFallbacks, createDefaultSettings } from './defaults';
import { globalSettingsSchema, type GlobalSettings, type GlobalSettingsInput } from './schema';

export async function getTenantSettings(tenantId: string): Promise<GlobalSettings> {
  const [row] = await db.select().from(appSettings).where(eq(appSettings.tenantId, tenantId));
  if (!row) return saveTenantSettings(tenantId, createDefaultSettings());
  const stored = row.settings as GlobalSettingsInput;
  const resolved = applyDefaultSettingsFallbacks(stored);
  return stored.colors === undefined ? saveTenantSettings(tenantId, resolved) : resolved;
}

export async function saveTenantSettings(tenantId: string, settings: GlobalSettingsInput): Promise<GlobalSettings> {
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

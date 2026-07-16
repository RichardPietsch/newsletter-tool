import { eq } from 'drizzle-orm';
import { db, DEFAULT_USER_ID } from '@/lib/db';
import { appSettings } from '@/lib/db/schema';
import { applyDefaultSettingsFallbacks, createDefaultSettings } from './defaults';
import { globalSettingsSchema, type GlobalSettings } from './schema';

export const GLOBAL_SETTINGS_ID = 'global';

export async function getUserSettings(ownerId: string): Promise<GlobalSettings> {
  const [row] = await db.select().from(appSettings).where(eq(appSettings.id, ownerId));
  if (!row) return createDefaultSettings();
  return applyDefaultSettingsFallbacks(globalSettingsSchema.parse(row.settings));
}

export async function saveUserSettings(ownerId: string, settings: GlobalSettings): Promise<GlobalSettings> {
  const parsed = globalSettingsSchema.parse(settings);
  await db
    .insert(appSettings)
    .values({ id: ownerId, ownerId, settings: parsed, updatedAt: new Date() })
    .onConflictDoUpdate({ target: appSettings.id, set: { settings: parsed, updatedAt: new Date(), ownerId } });
  return parsed;
}

export async function getGlobalSettings(): Promise<GlobalSettings> {
  return getUserSettings(DEFAULT_USER_ID);
}

export async function saveGlobalSettings(settings: GlobalSettings): Promise<GlobalSettings> {
  return saveUserSettings(DEFAULT_USER_ID, settings);
}

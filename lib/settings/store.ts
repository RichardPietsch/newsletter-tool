import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { appSettings } from '@/lib/db/schema';
import { createDefaultSettings } from './defaults';
import { globalSettingsSchema, type GlobalSettings } from './schema';

export const GLOBAL_SETTINGS_ID = 'global';

export async function getGlobalSettings(): Promise<GlobalSettings> {
  const [row] = await db.select().from(appSettings).where(eq(appSettings.id, GLOBAL_SETTINGS_ID));
  if (!row) return createDefaultSettings();
  return globalSettingsSchema.parse(row.settings);
}

export async function saveGlobalSettings(settings: GlobalSettings): Promise<GlobalSettings> {
  const parsed = globalSettingsSchema.parse(settings);
  await db
    .insert(appSettings)
    .values({ id: GLOBAL_SETTINGS_ID, settings: parsed, updatedAt: new Date() })
    .onConflictDoUpdate({ target: appSettings.id, set: { settings: parsed, updatedAt: new Date() } });
  return parsed;
}

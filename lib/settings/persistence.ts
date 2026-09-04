import { applyDefaultSettingsFallbacks, createDefaultSettings } from './defaults';
import {
  CURRENT_TENANT_SETTINGS_SCHEMA_VERSION,
  globalSettingsSchema,
  persistedGlobalSettingsSchema,
  type GlobalSettings,
  type GlobalSettingsInput,
  type PersistedGlobalSettings,
} from './schema';

export function resolvePersistedTenantSettings(settings: unknown): GlobalSettings {
  return applyDefaultSettingsFallbacks(settings as GlobalSettingsInput);
}

export function serializeTenantSettings(settings: GlobalSettingsInput): PersistedGlobalSettings {
  const parsed = globalSettingsSchema.parse(settings);
  return persistedGlobalSettingsSchema.parse({
    schemaVersion: CURRENT_TENANT_SETTINGS_SCHEMA_VERSION,
    ...parsed,
  });
}

export function isCurrentPersistedTenantSettings(settings: unknown): settings is PersistedGlobalSettings {
  return persistedGlobalSettingsSchema.safeParse(settings).success;
}

export function tenantSettingsPersistenceUpgrade(settings: unknown | undefined): PersistedGlobalSettings | null {
  if (settings === undefined) return serializeTenantSettings(createDefaultSettings());
  if (isCurrentPersistedTenantSettings(settings)) return null;
  return serializeTenantSettings(resolvePersistedTenantSettings(settings));
}

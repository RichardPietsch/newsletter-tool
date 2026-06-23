import { SettingsEditor } from '@/components/settings/settings-editor';
import { getGlobalSettings } from '@/lib/settings/store';

export default async function SettingsPage() {
  const settings = await getGlobalSettings();
  return <SettingsEditor initialSettings={settings} />;
}

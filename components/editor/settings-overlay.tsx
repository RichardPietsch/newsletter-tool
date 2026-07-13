'use client';

import type { GlobalSettings } from '@/lib/settings/schema';
import { SettingsEditor } from '@/components/settings/settings-editor';
import { Overlay } from './overlay';

export function SettingsOverlay({ open, onClose, settings, usedHeaderVariantIds }: { open: boolean; onClose: () => void; settings: GlobalSettings; usedHeaderVariantIds: string[] }) {
  if (!open) return null;
  return (
    <Overlay title={t('misc.settingsTitle')} onClose={onClose}>
      <SettingsEditor initialSettings={settings} usedHeaderVariantIds={usedHeaderVariantIds} embedded />
    </Overlay>
  );
}

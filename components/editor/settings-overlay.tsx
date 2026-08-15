'use client';

import { t } from '@/lib/i18n';
import type { GlobalSettings } from '@/lib/settings/schema';
import { SettingsEditor } from '@/components/settings/settings-editor';
import { Overlay } from './overlay';

export function SettingsOverlay({
  open,
  onClose,
  settings,
  usedHeaderVariantIds,
  readOnly = false,
}: {
  open: boolean;
  onClose: () => void;
  settings: GlobalSettings;
  usedHeaderVariantIds: string[];
  readOnly?: boolean;
}) {
  if (!open) return null;
  return (
    <Overlay title={t('misc.settingsTitle')} onClose={onClose}>
      <SettingsEditor
        initialSettings={settings}
        usedHeaderVariantIds={usedHeaderVariantIds}
        embedded
        readOnly={readOnly}
      />
    </Overlay>
  );
}

'use client';

import type { ReactNode } from 'react';
import { useState } from 'react';
import type { GlobalSettings } from '@/lib/settings/schema';
import { AccountOverlay } from './account-overlay';
import { MediaLibraryOverlay } from './media-library-overlay';
import { SettingsOverlay } from './settings-overlay';
import { SideRail } from './side-rail';

type AccountInfo = {
  email: string;
  lastLoginAt: string | null;
};

export function NewsletterOverviewShell({
  children,
  settings,
  account,
  usedHeaderVariantIds,
}: {
  children: ReactNode;
  settings: GlobalSettings;
  account: AccountInfo;
  usedHeaderVariantIds: string[];
}) {
  const [overlay, setOverlay] = useState<'media' | 'settings' | 'account' | null>(null);

  return (
    <div className="flex min-h-screen bg-[#f4f1ec]">
      <SideRail
        onOpenMedia={() => setOverlay('media')}
        onOpenSettings={() => setOverlay('settings')}
        onOpenAccount={() => setOverlay('account')}
      />
      <div className="flex-1">{children}</div>
      <MediaLibraryOverlay open={overlay === 'media'} onClose={() => setOverlay(null)} />
      <SettingsOverlay open={overlay === 'settings'} onClose={() => setOverlay(null)} settings={settings} usedHeaderVariantIds={usedHeaderVariantIds} />
      <AccountOverlay open={overlay === 'account'} onClose={() => setOverlay(null)} account={account} />
    </div>
  );
}

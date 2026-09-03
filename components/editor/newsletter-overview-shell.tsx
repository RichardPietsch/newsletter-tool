'use client';

import type { ReactNode } from 'react';
import { useState } from 'react';
import type { GlobalSettings } from '@/lib/settings/schema';
import { AccountOverlay } from './account-overlay';
import { MediaLibraryOverlay } from './media-library-overlay';
import { EventLibraryOverlay } from './event-library-overlay';
import { SettingsOverlay } from './settings-overlay';
import { SideRail } from './side-rail';
import { OnboardingTour } from './onboarding-tour';

type AccountInfo = {
  email: string;
  lastLoginAt: string | null;
};

export function NewsletterOverviewShell({
  children,
  settings,
  account,
  usedHeaderVariantIds,
  firstNewsletterHref,
  readOnly = false,
}: {
  children: ReactNode;
  settings: GlobalSettings;
  account: AccountInfo;
  usedHeaderVariantIds: string[];
  firstNewsletterHref?: string;
  readOnly?: boolean;
}) {
  const [overlay, setOverlay] = useState<'media' | 'events' | 'settings' | 'account' | null>(null);

  return (
    <div className="flex min-h-screen bg-[#f4f1ec]">
      <SideRail
        onOpenMedia={() => setOverlay('media')}
        onOpenEvents={() => setOverlay('events')}
        onOpenSettings={() => setOverlay('settings')}
        onOpenAccount={() => setOverlay('account')}
      />
      <div className="flex-1">{children}</div>
      <MediaLibraryOverlay open={overlay === 'media'} onClose={() => setOverlay(null)} readOnly={readOnly} />
      <EventLibraryOverlay open={overlay === 'events'} onClose={() => setOverlay(null)} readOnly={readOnly} />
      <SettingsOverlay
        open={overlay === 'settings'}
        onClose={() => setOverlay(null)}
        settings={settings}
        usedHeaderVariantIds={usedHeaderVariantIds}
        readOnly={readOnly}
      />
      <AccountOverlay open={overlay === 'account'} onClose={() => setOverlay(null)} account={account} />
      <OnboardingTour variant="overview" accountEmail={account.email} firstNewsletterHref={firstNewsletterHref} />
    </div>
  );
}

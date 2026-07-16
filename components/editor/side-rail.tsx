'use client';

import { t } from '@/lib/i18n';

import type { ReactNode } from 'react';
import { MdiIcon } from './icons';

type SideRailProps = {
  onExport?: () => void;
  onOpenNewsletterSettings?: () => void;
  onOpenMedia: () => void;
  onOpenSettings: () => void;
  onOpenAccount: () => void;
};

function RailButton({ label, children, onClick, href, emphasized = false, tourId }: { label: string; children: ReactNode; onClick?: () => void; href?: string; emphasized?: boolean; tourId?: string }) {
  const className = `rounded p-3 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600 ${emphasized ? 'text-[#012aff]' : 'text-slate-700'}`;
  if (href) {
    return <a className={className} href={href} aria-label={label} title={label} data-tour={tourId}>{children}</a>;
  }
  return <button type="button" onClick={onClick} className={className} aria-label={label} title={label} data-tour={tourId}>{children}</button>;
}

export function SideRail({ onExport, onOpenNewsletterSettings, onOpenMedia, onOpenSettings, onOpenAccount }: SideRailProps) {
  return (
    <nav className="sticky top-0 z-20 flex h-screen w-20 shrink-0 flex-col items-center gap-3 border-r bg-white py-4" aria-label={t('misc.functionRail')}>
      <RailButton href="/newsletters" label={t('misc.newsletterOverview')} tourId="nav-overview"><MdiIcon name="home" /></RailButton>
      <RailButton onClick={onOpenMedia} label={t('misc.mediaTitle')} tourId="nav-media"><MdiIcon name="media" /></RailButton>
      <RailButton onClick={onOpenSettings} label={t('misc.settingsTitle')} tourId="nav-settings"><MdiIcon name="cog" /></RailButton>
      <RailButton onClick={onOpenAccount} label={t('account.title')} tourId="nav-account"><MdiIcon name="account" /></RailButton>
      <div className="mt-auto flex flex-col items-center gap-3">
        {onOpenNewsletterSettings ? <RailButton onClick={onOpenNewsletterSettings} label={t('misc.newsletterSettingsTitle')} tourId="newsletter-settings"><MdiIcon name="emailEdit" className="h-7 w-7" /></RailButton> : null}
        {onExport ? <RailButton onClick={onExport} label={t('export.dialogTitle')} tourId="nav-export" emphasized><MdiIcon name="download" className="h-7 w-7" /></RailButton> : null}
      </div>
    </nav>
  );
}

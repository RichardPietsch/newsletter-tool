'use client';

import type { ReactNode } from 'react';
import { MdiIcon } from './icons';

type SideRailProps = {
  onExport?: () => void;
  onExportTemplate?: () => void;
  onOpenNewsletterSettings?: () => void;
  onOpenMedia: () => void;
  onOpenSettings: () => void;
  onOpenAccount: () => void;
};

function RailButton({ label, children, onClick, href, emphasized = false }: { label: string; children: ReactNode; onClick?: () => void; href?: string; emphasized?: boolean }) {
  const className = `rounded p-3 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600 ${emphasized ? 'text-[#012aff]' : 'text-slate-700'}`;
  if (href) {
    return <a className={className} href={href} aria-label={label} title={label}>{children}</a>;
  }
  return <button type="button" onClick={onClick} className={className} aria-label={label} title={label}>{children}</button>;
}

export function SideRail({ onExport, onExportTemplate, onOpenNewsletterSettings, onOpenMedia, onOpenSettings, onOpenAccount }: SideRailProps) {
  return (
    <nav className="sticky top-0 z-20 flex h-screen w-20 shrink-0 flex-col items-center gap-3 border-r bg-white py-4" aria-label="Funktionsleiste">
      <RailButton href="/newsletters" label="Newsletter-Übersicht"><MdiIcon name="home" /></RailButton>
      <RailButton onClick={onOpenMedia} label="Medien"><MdiIcon name="media" /></RailButton>
      <RailButton onClick={onOpenSettings} label="Einstellungen"><MdiIcon name="cog" /></RailButton>
      <RailButton onClick={onOpenAccount} label="Account"><MdiIcon name="account" /></RailButton>
      <div className="mt-auto flex flex-col items-center gap-3">
        {onOpenNewsletterSettings ? <RailButton onClick={onOpenNewsletterSettings} label="Newsletter-Einstellungen"><MdiIcon name="emailEdit" className="h-7 w-7" /></RailButton> : null}
        {onExportTemplate ? <RailButton onClick={onExportTemplate} label="YML-Template exportieren"><MdiIcon name="download" /></RailButton> : null}
        {onExport ? <RailButton onClick={onExport} label="HTML exportieren" emphasized><MdiIcon name="download" className="h-7 w-7" /></RailButton> : null}
      </div>
    </nav>
  );
}

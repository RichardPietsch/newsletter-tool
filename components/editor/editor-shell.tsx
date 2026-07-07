'use client';

import { useEffect, useState } from 'react';
import type { NewsletterDocument } from '@/lib/newsletter/schema';
import { initStore, useNewsletterStore } from '@/lib/newsletter/store';
import type { GlobalSettings } from '@/lib/settings/schema';
import { AccountOverlay } from './account-overlay';
import { InspectorPanel } from './inspector-panel';
import { MediaLibraryOverlay } from './media-library-overlay';
import { NewsletterCanvas } from './newsletter-canvas';
import { SaveStatus } from './save-status';
import { SettingsOverlay } from './settings-overlay';
import { SideRail } from './side-rail';
import { UndoRedoControls } from './undo-redo-controls';

type AccountInfo = {
  email: string;
  lastLoginAt: string | null;
};

export function EditorShell({
  id,
  document,
  settings,
  account,
  usedHeaderVariantIds = [],
}: {
  id: string;
  document: NewsletterDocument;
  settings?: GlobalSettings;
  account: AccountInfo;
  usedHeaderVariantIds?: string[];
}) {
  const [overlay, setOverlay] = useState<'media' | 'settings' | 'account' | null>(null);
  useEffect(() => initStore(id, document), [id, document]);
  const doc = useNewsletterStore((s) => s.doc);
  const setStatus = useNewsletterStore((s) => s.setStatus);
  const setTitle = useNewsletterStore((s) => s.setTitle);

  useEffect(() => {
    if (!doc) return;
    const t = setTimeout(async () => {
      setStatus('saving');
      const r = await fetch(`/api/newsletters/${id}`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ title: doc.title, document: doc }) });
      setStatus(r.ok ? 'saved' : 'error');
    }, 900);
    return () => clearTimeout(t);
  }, [doc, id, setStatus]);

  if (!doc) return null;

  return (
    <div className="flex min-h-screen">
      <SideRail
        onExport={() => { window.location.href = `/api/newsletters/${id}/export`; }}
        onOpenMedia={() => setOverlay('media')}
        onOpenSettings={() => setOverlay('settings')}
        onOpenAccount={() => setOverlay('account')}
      />
      <main className="flex-1 bg-[#f4f1ec]">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white p-4">
          <input aria-label="Newsletter-Titel" className="text-xl font-bold" value={doc.title} onChange={(e) => setTitle(e.target.value)} />
          <div className="flex items-center gap-4"><UndoRedoControls /><SaveStatus /></div>
        </div>
        <NewsletterCanvas settings={settings} />
      </main>
      <InspectorPanel settings={settings} />
      <MediaLibraryOverlay open={overlay === 'media'} onClose={() => setOverlay(null)} />
      {settings ? <SettingsOverlay open={overlay === 'settings'} onClose={() => setOverlay(null)} settings={settings} usedHeaderVariantIds={usedHeaderVariantIds} /> : null}
      <AccountOverlay open={overlay === 'account'} onClose={() => setOverlay(null)} account={account} />
    </div>
  );
}

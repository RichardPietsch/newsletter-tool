'use client';

import { useEffect, useState } from 'react';
import type { ExportValidationIssue } from '@/lib/newsletter/export-validation';
import type { NewsletterDocument } from '@/lib/newsletter/schema';
import { initStore, useNewsletterStore } from '@/lib/newsletter/store';
import type { GlobalSettings } from '@/lib/settings/schema';
import { AccountOverlay } from './account-overlay';
import { ExportIssuesOverlay } from './export-issues-overlay';
import { InspectorPanel } from './inspector-panel';
import { MediaLibraryOverlay } from './media-library-overlay';
import { NewsletterCanvas } from './newsletter-canvas';
import { NewsletterSettingsOverlay } from './newsletter-settings-overlay';
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
  sentAt = null,
}: {
  id: string;
  document: NewsletterDocument;
  settings?: GlobalSettings;
  account: AccountInfo;
  usedHeaderVariantIds?: string[];
  sentAt?: string | null;
}) {
  const [overlay, setOverlay] = useState<'media' | 'settings' | 'account' | 'newsletter' | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportIssues, setExportIssues] = useState<ExportValidationIssue[]>([]);
  const [sentAtState, setSentAtState] = useState<string | null>(sentAt);
  useEffect(() => initStore(id, document), [id, document]);
  const doc = useNewsletterStore((state) => state.doc);
  const setStatus = useNewsletterStore((state) => state.setStatus);
  const setTitle = useNewsletterStore((state) => state.setTitle);
  const isReadOnly = Boolean(sentAtState);

  useEffect(() => {
    if (!doc || isReadOnly) return;
    const timeout = setTimeout(async () => {
      setStatus('saving');
      const response = await fetch(`/api/newsletters/${id}`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ title: doc.title, document: doc }) });
      setStatus(response.ok ? 'saved' : 'error');
    }, 900);
    return () => clearTimeout(timeout);
  }, [doc, id, isReadOnly, setStatus]);

  async function handleExport() {
    setExportError(null);
    setExportIssues([]);
    try {
      const response = await fetch(`/api/newsletters/${id}/export`);
      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { error?: string; issues?: ExportValidationIssue[] } | null;
        setExportError(payload?.error ?? 'Newsletter kann nicht exportiert werden.');
        setExportIssues(payload?.issues ?? []);
        return;
      }

      const blob = await response.blob();
      const disposition = response.headers.get('content-disposition');
      const filename = disposition?.match(/filename="?([^";]+)"?/i)?.[1] ?? 'newsletter.html';
      const url = URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = url;
      link.download = filename;
      window.document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch {
      setExportError('Der Export konnte nicht gestartet werden. Bitte prüfe deine Verbindung und versuche es erneut.');
      setExportIssues([]);
    }
  }

  async function renameNewsletter(nextTitle: string) {
    if (isReadOnly) return;
    const response = await fetch(`/api/newsletters/${id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ title: nextTitle }) });
    if (!response.ok) throw new Error('Rename failed');
    setTitle(nextTitle);
  }

  async function markNewsletterSent() {
    if (!window.confirm('Newsletter wirklich als versendet markieren? Danach kann er nicht mehr bearbeitet werden.')) return;
    const response = await fetch(`/api/newsletters/${id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sent: true }) });
    if (!response.ok) return;
    const payload = await response.json() as { sentAt?: string };
    setSentAtState(payload.sentAt ?? new Date().toISOString());
    setStatus('saved');
  }

  async function deleteNewsletter() {
    if (!window.confirm('Newsletter wirklich dauerhaft löschen? Diese Aktion kann nicht rückgängig gemacht werden.')) return;
    const response = await fetch(`/api/newsletters/${id}`, { method: 'DELETE' });
    if (response.ok) window.location.href = '/newsletters';
  }

  if (!doc) return null;

  return (
    <div className="flex min-h-screen">
      <SideRail
        onExport={handleExport}
        onOpenNewsletterSettings={() => setOverlay('newsletter')}
        onOpenMedia={() => setOverlay('media')}
        onOpenSettings={() => setOverlay('settings')}
        onOpenAccount={() => setOverlay('account')}
      />
      <main className="flex-1 bg-[#f4f1ec]">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white p-4">
          <div>
            <input aria-label="Newsletter-Titel" className="text-xl font-bold disabled:bg-transparent disabled:text-slate-700" value={doc.title} disabled={isReadOnly} onChange={(event) => setTitle(event.target.value)} />
            {isReadOnly ? <p className="mt-1 text-sm text-green-700">Als versendet markiert · schreibgeschützt</p> : null}
          </div>
          <div className="flex items-center gap-4"><UndoRedoControls disabled={isReadOnly} /><SaveStatus /></div>
        </div>
        <NewsletterCanvas settings={settings} readOnly={isReadOnly} />
      </main>
      <InspectorPanel settings={settings} readOnly={isReadOnly} />
      <MediaLibraryOverlay open={overlay === 'media'} onClose={() => setOverlay(null)} />
      {settings ? <SettingsOverlay open={overlay === 'settings'} onClose={() => setOverlay(null)} settings={settings} usedHeaderVariantIds={usedHeaderVariantIds} /> : null}
      <AccountOverlay open={overlay === 'account'} onClose={() => setOverlay(null)} account={account} />
      <NewsletterSettingsOverlay open={overlay === 'newsletter'} title={doc.title} sentAt={sentAtState} onClose={() => setOverlay(null)} onRename={renameNewsletter} onMarkSent={markNewsletterSent} onDelete={deleteNewsletter} />
      <ExportIssuesOverlay open={exportError !== null} error={exportError ?? ''} issues={exportIssues} onClose={() => setExportError(null)} />
    </div>
  );
}

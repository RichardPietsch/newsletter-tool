'use client';

import { useEffect, useState } from 'react';
import type { ExportValidationIssue } from '@/lib/newsletter/export-validation';
import type { NewsletterDocument } from '@/lib/newsletter/schema';
import { validateNewsletterForSave, type NewsletterSaveIssue } from '@/lib/newsletter/save-validation';
import { initStore, useNewsletterStore } from '@/lib/newsletter/store';
import type { GlobalSettings } from '@/lib/settings/schema';
import { AccountOverlay } from './account-overlay';
import { ExportIssuesOverlay } from './export-issues-overlay';
import { InspectorPanel } from './inspector-panel';
import { MediaLibraryOverlay } from './media-library-overlay';
import { NewsletterCanvas } from './newsletter-canvas';
import { NewsletterSettingsOverlay } from './newsletter-settings-overlay';
import { Overlay } from './overlay';
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
  const [overlay, setOverlay] = useState<'media' | 'settings' | 'account' | 'newsletter' | 'export' | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportIssues, setExportIssues] = useState<ExportValidationIssue[]>([]);
  const [sentAtState, setSentAtState] = useState<string | null>(sentAt);
  const [saveIssues, setSaveIssues] = useState<NewsletterSaveIssue[]>([]);
  useEffect(() => initStore(id, document), [id, document]);
  const doc = useNewsletterStore((state) => state.doc);
  const setStatus = useNewsletterStore((state) => state.setStatus);
  const setTitle = useNewsletterStore((state) => state.setTitle);
  const isReadOnly = Boolean(sentAtState);

  useEffect(() => {
    if (!doc || isReadOnly) return;
    const timeout = setTimeout(async () => {
      const issues = validateNewsletterForSave(doc);
      if (issues.length > 0) {
        setSaveIssues(issues);
        setStatus('error');
        return;
      }
      setStatus('saving');
      const response = await fetch(`/api/newsletters/${id}`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ title: doc.title, document: doc }) });
      if (response.ok) {
        setSaveIssues([]);
        setStatus('saved');
      } else {
        setSaveIssues([{ path: 'server', message: 'Der Server hat das Speichern abgelehnt. Bitte prüfe deine Eingaben und versuche es erneut.', blockLabel: 'Newsletter' }]);
        setStatus('error');
      }
    }, 900);
    return () => clearTimeout(timeout);
  }, [doc, id, isReadOnly, setStatus]);

  async function downloadNewsletterExport(format: 'html' | 'yml') {
    const response = await fetch(`/api/newsletters/${id}/export${format === 'yml' ? '?format=yml' : ''}`);
    if (!response.ok) {
      const payload = await response.json().catch(() => null) as { error?: string; issues?: ExportValidationIssue[] } | null;
      setExportError(payload?.error ?? 'Newsletter kann nicht exportiert werden.');
      setExportIssues(payload?.issues ?? []);
      return;
    }

    const blob = await response.blob();
    const disposition = response.headers.get('content-disposition');
    const filename = disposition?.match(/filename="?([^";]+)"?/i)?.[1] ?? (format === 'yml' ? 'newsletter.yml' : 'newsletter.html');
    const url = URL.createObjectURL(blob);
    const link = window.document.createElement('a');
    link.href = url;
    link.download = filename;
    window.document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  async function handleExport() {
    if (process.env.NODE_ENV !== 'production') {
      setOverlay('export');
      return;
    }

    await handleHtmlExport();
  }

  async function handleHtmlExport() {
    setExportError(null);
    setExportIssues([]);
    try {
      await downloadNewsletterExport('html');
    } catch {
      setExportError('Der Export konnte nicht gestartet werden. Bitte prüfe deine Verbindung und versuche es erneut.');
      setExportIssues([]);
    }
  }

  async function handleTemplateExport() {
    setExportError(null);
    setExportIssues([]);
    try {
      await downloadNewsletterExport('yml');
    } catch {
      setExportError('Der Template-Export konnte nicht gestartet werden. Bitte prüfe deine Verbindung und versuche es erneut.');
      setExportIssues([]);
    }
  }

  async function renameNewsletter(nextTitle: string) {
    if (isReadOnly) return;
    const response = await fetch(`/api/newsletters/${id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ title: nextTitle }) });
    if (!response.ok) throw new Error('Rename failed');
    setTitle(nextTitle);
  }

  async function toggleNewsletterSent() {
    const nextSent = !sentAtState;
    const message = nextSent
      ? 'Newsletter wirklich als versendet markieren? Danach ist er schreibgeschützt, kann aber bei Bedarf wieder freigegeben werden.'
      : 'Versendet-Markierung wirklich aufheben? Danach kann der Newsletter wieder bearbeitet werden.';
    if (!window.confirm(message)) return;
    const response = await fetch(`/api/newsletters/${id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sent: nextSent }) });
    if (!response.ok) return;
    const payload = await response.json() as { sentAt?: string | null };
    setSentAtState(payload.sentAt ?? null);
    setStatus('saved');
  }

  async function cloneNewsletter() {
    const response = await fetch(`/api/newsletters/${id}`, { method: 'POST' });
    if (!response.ok) return;
    const payload = await response.json() as { location?: string };
    window.location.href = payload.location ?? '/newsletters';
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
            <input aria-label="Newsletter-Titel" className={`text-xl font-bold disabled:bg-transparent disabled:text-slate-700 ${saveIssues.some((issue) => issue.fieldKey === 'document.title') ? 'rounded outline outline-2 outline-red-500' : ''}`} value={doc.title} disabled={isReadOnly} onChange={(event) => setTitle(event.target.value)} />
            {isReadOnly ? <p className="mt-1 text-sm text-green-700">Als versendet markiert · schreibgeschützt</p> : null}
          </div>
          <div className="flex items-center gap-4"><UndoRedoControls disabled={isReadOnly} /><SaveStatus issues={saveIssues} /></div>
        </div>
        <NewsletterCanvas settings={settings} readOnly={isReadOnly} validationIssues={saveIssues} />
      </main>
      <InspectorPanel settings={settings} readOnly={isReadOnly} validationIssues={saveIssues} />
      <MediaLibraryOverlay open={overlay === 'media'} onClose={() => setOverlay(null)} />
      {settings ? <SettingsOverlay open={overlay === 'settings'} onClose={() => setOverlay(null)} settings={settings} usedHeaderVariantIds={usedHeaderVariantIds} /> : null}
      <AccountOverlay open={overlay === 'account'} onClose={() => setOverlay(null)} account={account} />
      <NewsletterSettingsOverlay open={overlay === 'newsletter'} title={doc.title} sentAt={sentAtState} onClose={() => setOverlay(null)} onRename={renameNewsletter} onToggleSent={toggleNewsletterSent} onClone={cloneNewsletter} onDelete={deleteNewsletter} />
      {overlay === 'export' ? (
        <Overlay title="Newsletter exportieren" onClose={() => setOverlay(null)}>
          <div className="mx-auto max-w-xl space-y-4 p-6">
            <p className="text-sm text-slate-600">Wähle das Exportformat für diese Test- bzw. Entwicklungsumgebung.</p>
            <button type="button" className="block w-full rounded border bg-white p-4 text-left transition hover:border-blue-600 hover:bg-blue-50" onClick={() => { setOverlay(null); void handleHtmlExport(); }}>
              <span className="block font-semibold">Export als HTML</span>
              <span className="text-sm text-slate-600">Erzeugt die finale Newsletter-Datei für den Versand.</span>
            </button>
            <button type="button" className="block w-full rounded border bg-white p-4 text-left transition hover:border-blue-600 hover:bg-blue-50" onClick={() => { setOverlay(null); void handleTemplateExport(); }}>
              <span className="block font-semibold">Export als YML</span>
              <span className="text-sm text-slate-600">Speichert den Newsletter als wiederverwendbares Template für Testnutzer.</span>
            </button>
          </div>
        </Overlay>
      ) : null}
      <ExportIssuesOverlay open={exportError !== null} error={exportError ?? ''} issues={exportIssues} onClose={() => setExportError(null)} />
    </div>
  );
}

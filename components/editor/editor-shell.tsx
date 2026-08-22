'use client';

import { useCallback, useEffect, useState } from 'react';
import type { NewsletterDocument } from '@/lib/newsletter/schema';
import type { NewsletterSaveIssue } from '@/lib/newsletter/save-validation';
import { initStore, useNewsletterStore } from '@/lib/newsletter/store';
import type { GlobalSettings } from '@/lib/settings/schema';
import { newsletterColorPalettes, type NewsletterPreviewMode } from '@/lib/newsletter/module-styles';
import { EditorOverlays } from './editor-overlays';
import { EditorTopBar } from './editor-top-bar';
import type { AccountInfo, EditorOverlay } from './editor-types';
import { InspectorPanel } from './inspector-panel';
import { NewsletterCanvas } from './newsletter-canvas';
import { OnboardingTour } from './onboarding-tour';
import { SideRail } from './side-rail';
import { useNewsletterActions } from './use-newsletter-actions';
import { useNewsletterAutosave } from './use-newsletter-autosave';
import { useNewsletterExport } from './use-newsletter-export';

export function EditorShell({
  id,
  document,
  settings,
  account,
  usedHeaderVariantIds = [],
  sentAt = null,
  forceReadOnly = false,
}: {
  id: string;
  document: NewsletterDocument;
  settings?: GlobalSettings;
  account: AccountInfo;
  usedHeaderVariantIds?: string[];
  sentAt?: string | null;
  forceReadOnly?: boolean;
}) {
  const [overlay, setOverlay] = useState<EditorOverlay>(null);
  const [saveIssues, setSaveIssues] = useState<NewsletterSaveIssue[]>([]);
  const [previewMode, setPreviewMode] = useState<NewsletterPreviewMode>('light');
  const doc = useNewsletterStore((state) => state.doc);
  const setTitle = useNewsletterStore((state) => state.setTitle);
  const openOverlay = useCallback((nextOverlay: Exclude<EditorOverlay, null>) => setOverlay(nextOverlay), []);
  const closeOverlay = useCallback(() => setOverlay(null), []);

  useEffect(() => initStore(id, document), [id, document]);

  const { sentAtState, isReadOnly, renameNewsletter, toggleNewsletterSent, cloneNewsletter, deleteNewsletter } =
    useNewsletterActions({ id, sentAt, forceReadOnly });
  const { exportError, exportIssues, handleExport, handleHtmlExport, handleTemplateExport, clearExportError } =
    useNewsletterExport({ id, openExportDialog: () => openOverlay('export') });

  useNewsletterAutosave({ id, doc, isReadOnly, onIssuesChange: setSaveIssues });

  if (!doc) return null;

  return (
    <div className="flex min-h-screen">
      <SideRail
        onExport={handleExport}
        onOpenNewsletterSettings={() => openOverlay('newsletter')}
        onOpenMedia={() => openOverlay('media')}
        onOpenSettings={() => openOverlay('settings')}
        onOpenAccount={() => openOverlay('account')}
      />
      <main
        className="flex-1 transition-colors"
        data-editor-interface="newsletter-editor"
        style={{ backgroundColor: newsletterColorPalettes[previewMode].background }}
      >
        <EditorTopBar
          title={doc.title}
          isReadOnly={isReadOnly}
          saveIssues={saveIssues}
          previewMode={previewMode}
          onPreviewModeChange={setPreviewMode}
          onTitleChange={setTitle}
        />
        <NewsletterCanvas
          settings={settings}
          readOnly={isReadOnly}
          validationIssues={saveIssues}
          previewMode={previewMode}
        />
      </main>
      <InspectorPanel settings={settings} readOnly={isReadOnly} validationIssues={saveIssues} />
      <EditorOverlays
        overlay={overlay}
        settings={settings}
        account={account}
        usedHeaderVariantIds={usedHeaderVariantIds}
        readOnly={forceReadOnly}
        title={doc.title}
        sentAt={sentAtState}
        exportError={exportError}
        exportIssues={exportIssues}
        onCloseOverlay={closeOverlay}
        onRename={renameNewsletter}
        onToggleSent={toggleNewsletterSent}
        onClone={cloneNewsletter}
        onDelete={deleteNewsletter}
        onHtmlExport={handleHtmlExport}
        onTemplateExport={handleTemplateExport}
        onCloseExportError={clearExportError}
      />
      <OnboardingTour variant="editor" accountEmail={account.email} />
    </div>
  );
}

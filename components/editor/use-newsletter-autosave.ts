'use client';

import { useEffect, useRef } from 'react';
import { t } from '@/lib/i18n';
import type { NewsletterDocument } from '@/lib/newsletter/schema';
import { validateNewsletterForSave, type NewsletterSaveIssue } from '@/lib/newsletter/save-validation';
import { useNewsletterStore } from '@/lib/newsletter/store';
import { AutosaveRequestTracker, classifyAutosaveFailure, type AutosaveFailureKind } from './autosave-request-tracker';

function serverIssue(kind: AutosaveFailureKind): NewsletterSaveIssue {
  const message =
    kind === 'network'
      ? t('misc.networkSaveFailed')
      : kind === 'server'
        ? t('misc.serverSaveFailed')
        : t('misc.serverSaveRejected');
  return { path: `server.${kind}`, message, blockLabel: 'Newsletter' };
}

export function useNewsletterAutosave({
  id,
  doc,
  isReadOnly,
  onIssuesChange,
}: {
  id: string;
  doc: NewsletterDocument | null;
  isReadOnly: boolean;
  onIssuesChange: (issues: NewsletterSaveIssue[]) => void;
}) {
  const setStatus = useNewsletterStore((state) => state.setStatus);
  const tracker = useRef(new AutosaveRequestTracker());

  useEffect(() => {
    const revision = tracker.current.supersede();
    if (!doc || isReadOnly) return;

    const issues = validateNewsletterForSave(doc);
    if (issues.length > 0) {
      onIssuesChange(issues);
      setStatus('error');
      return;
    }

    onIssuesChange([]);
    setStatus('saving');
    const timeout = setTimeout(async () => {
      const signal = tracker.current.start(revision);
      if (!signal) return;

      try {
        const response = await fetch(`/api/newsletters/${id}`, {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ title: doc.title, document: doc }),
          signal,
        });
        if (!tracker.current.isLatest(revision)) return;

        if (response.ok) {
          onIssuesChange([]);
          setStatus('saved');
          return;
        }

        onIssuesChange([serverIssue(classifyAutosaveFailure(response.status))]);
        setStatus('error');
      } catch {
        if (signal.aborted || !tracker.current.isLatest(revision)) return;
        onIssuesChange([serverIssue('network')]);
        setStatus('error');
      }
    }, 900);
    return () => {
      clearTimeout(timeout);
      if (tracker.current.isLatest(revision)) tracker.current.supersede();
    };
  }, [doc, id, isReadOnly, onIssuesChange, setStatus]);
}

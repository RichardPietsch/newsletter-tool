'use client';

import { useEffect } from 'react';
import { t } from '@/lib/i18n';
import type { NewsletterDocument } from '@/lib/newsletter/schema';
import { validateNewsletterForSave, type NewsletterSaveIssue } from '@/lib/newsletter/save-validation';
import { useNewsletterStore } from '@/lib/newsletter/store';

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

  useEffect(() => {
    if (!doc || isReadOnly) return;
    const timeout = setTimeout(async () => {
      const issues = validateNewsletterForSave(doc);
      if (issues.length > 0) {
        onIssuesChange(issues);
        setStatus('error');
        return;
      }
      setStatus('saving');
      const response = await fetch(`/api/newsletters/${id}`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ title: doc.title, document: doc }),
      });
      if (response.ok) {
        onIssuesChange([]);
        setStatus('saved');
      } else {
        onIssuesChange([{ path: 'server', message: t('misc.serverSaveRejected'), blockLabel: 'Newsletter' }]);
        setStatus('error');
      }
    }, 900);
    return () => clearTimeout(timeout);
  }, [doc, id, isReadOnly, onIssuesChange, setStatus]);
}

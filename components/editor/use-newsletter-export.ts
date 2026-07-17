'use client';

import { useState } from 'react';
import { getApiErrorIssues, getApiErrorMessage } from '@/lib/api/error-message';
import { t } from '@/lib/i18n';
import type { ExportValidationIssue } from '@/lib/newsletter/export-validation';

type ExportFormat = 'html' | 'yml';

export function useNewsletterExport({ id, openExportDialog }: { id: string; openExportDialog: () => void }) {
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportIssues, setExportIssues] = useState<ExportValidationIssue[]>([]);

  async function downloadNewsletterExport(format: ExportFormat) {
    const response = await fetch(`/api/newsletters/${id}/export${format === 'yml' ? '?format=yml' : ''}`);
    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      setExportError(getApiErrorMessage(payload, t('export.cannotExport')));
      setExportIssues(getApiErrorIssues<ExportValidationIssue>(payload));
      return;
    }

    const blob = await response.blob();
    const disposition = response.headers.get('content-disposition');
    const filename =
      disposition?.match(/filename="?([^";]+)"?/i)?.[1] ?? (format === 'yml' ? 'newsletter.yml' : 'newsletter.html');
    const url = URL.createObjectURL(blob);
    const link = window.document.createElement('a');
    link.href = url;
    link.download = filename;
    window.document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  async function handleHtmlExport() {
    setExportError(null);
    setExportIssues([]);
    try {
      await downloadNewsletterExport('html');
    } catch {
      setExportError(t('export.htmlStartError'));
      setExportIssues([]);
    }
  }

  async function handleTemplateExport() {
    setExportError(null);
    setExportIssues([]);
    try {
      await downloadNewsletterExport('yml');
    } catch {
      setExportError(t('export.templateStartError'));
      setExportIssues([]);
    }
  }

  async function handleExport() {
    if (process.env.NODE_ENV !== 'production') {
      openExportDialog();
      return;
    }

    await handleHtmlExport();
  }

  return {
    exportError,
    exportIssues,
    handleExport,
    handleHtmlExport,
    handleTemplateExport,
    clearExportError: () => setExportError(null),
  };
}

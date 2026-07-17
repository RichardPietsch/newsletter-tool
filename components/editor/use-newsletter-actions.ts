'use client';

import { useState } from 'react';
import { t } from '@/lib/i18n';
import { useNewsletterStore } from '@/lib/newsletter/store';

export function useNewsletterActions({ id, sentAt }: { id: string; sentAt?: string | null }) {
  const [sentAtState, setSentAtState] = useState<string | null>(sentAt ?? null);
  const setStatus = useNewsletterStore((state) => state.setStatus);
  const setTitle = useNewsletterStore((state) => state.setTitle);
  const isReadOnly = Boolean(sentAtState);

  async function renameNewsletter(nextTitle: string) {
    if (isReadOnly) return;
    const response = await fetch(`/api/newsletters/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: nextTitle }),
    });
    if (!response.ok) throw new Error('Rename failed');
    setTitle(nextTitle);
  }

  async function toggleNewsletterSent() {
    const nextSent = !sentAtState;
    const message = nextSent ? t('newsletterSettings.confirmSent') : t('newsletterSettings.confirmUnsent');
    if (!window.confirm(message)) return;
    const response = await fetch(`/api/newsletters/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ sent: nextSent }),
    });
    if (!response.ok) return;
    const payload = (await response.json()) as { sentAt?: string | null };
    setSentAtState(payload.sentAt ?? null);
    setStatus('saved');
  }

  async function cloneNewsletter() {
    const response = await fetch(`/api/newsletters/${id}`, { method: 'POST' });
    if (!response.ok) return;
    const payload = (await response.json()) as { location?: string };
    window.location.href = payload.location ?? '/newsletters';
  }

  async function deleteNewsletter() {
    if (!window.confirm(t('newsletterSettings.confirmDelete'))) return;
    const response = await fetch(`/api/newsletters/${id}`, { method: 'DELETE' });
    if (response.ok) window.location.href = '/newsletters';
  }

  return {
    sentAtState,
    isReadOnly,
    renameNewsletter,
    toggleNewsletterSent,
    cloneNewsletter,
    deleteNewsletter,
  };
}

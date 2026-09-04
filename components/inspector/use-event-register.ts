'use client';

import { useCallback, useEffect, useState } from 'react';
import type { EventInput, EventRecord } from '@/lib/events/schema';

export function useEventRegister() {
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setLoadFailed(false);
      try {
        const response = await fetch('/api/events', { signal: controller.signal });
        if (!response.ok) throw new Error('Event register could not be loaded');
        setEvents((await response.json()) as EventRecord[]);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === 'AbortError')) setLoadFailed(true);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void load();
    return () => controller.abort();
  }, []);

  const updateEvent = useCallback(async (id: string, input: EventInput) => {
    try {
      const response = await fetch('/api/events', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id, ...input }),
      });
      if (!response.ok) return false;
      const saved = (await response.json()) as EventRecord;
      setEvents((current) => current.map((event) => (event.id === saved.id ? saved : event)));
      return true;
    } catch {
      return false;
    }
  }, []);

  return { events, loading, loadFailed, updateEvent };
}

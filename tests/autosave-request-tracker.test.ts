import { describe, expect, it } from 'vitest';
import { AutosaveRequestTracker, classifyAutosaveFailure } from '@/components/editor/autosave-request-tracker';

describe('autosave request tracking', () => {
  it('aborts an older request and prevents it from becoming current again', () => {
    const tracker = new AutosaveRequestTracker();
    const firstRevision = tracker.supersede();
    const firstSignal = tracker.start(firstRevision);

    const secondRevision = tracker.supersede();
    const secondSignal = tracker.start(secondRevision);

    expect(firstSignal?.aborted).toBe(true);
    expect(tracker.isLatest(firstRevision)).toBe(false);
    expect(secondSignal?.aborted).toBe(false);
    expect(tracker.isLatest(secondRevision)).toBe(true);
  });

  it('does not start a request for a stale debounce callback', () => {
    const tracker = new AutosaveRequestTracker();
    const staleRevision = tracker.supersede();
    tracker.supersede();

    expect(tracker.start(staleRevision)).toBeNull();
  });

  it('distinguishes validation responses from server failures', () => {
    expect(classifyAutosaveFailure(400)).toBe('validation');
    expect(classifyAutosaveFailure(409)).toBe('validation');
    expect(classifyAutosaveFailure(500)).toBe('server');
    expect(classifyAutosaveFailure(503)).toBe('server');
  });
});

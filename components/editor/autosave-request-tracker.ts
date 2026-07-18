export class AutosaveRequestTracker {
  private revision = 0;
  private controller: AbortController | null = null;

  supersede() {
    this.controller?.abort();
    this.controller = null;
    this.revision += 1;
    return this.revision;
  }

  start(revision: number) {
    if (!this.isLatest(revision)) return null;
    this.controller = new AbortController();
    return this.controller.signal;
  }

  isLatest(revision: number) {
    return revision === this.revision;
  }
}

export type AutosaveFailureKind = 'validation' | 'network' | 'server';

export function classifyAutosaveFailure(status: number): Exclude<AutosaveFailureKind, 'network'> {
  return status >= 500 ? 'server' : 'validation';
}

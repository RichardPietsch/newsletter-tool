import { describe, expect, it } from 'vitest';
import { retentionCutoffs } from '@/lib/db/retention';

describe('audit retention', () => {
  it('uses an exact rolling 90-day cutoff', () => {
    const now = new Date('2026-08-15T12:00:00.000Z');
    expect(retentionCutoffs(now).audit.toISOString()).toBe('2026-05-17T12:00:00.000Z');
  });
});

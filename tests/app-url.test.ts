import { describe, expect, it } from 'vitest';
import { publicAppUrl } from '@/lib/app-url';

describe('public application URLs', () => {
  it('uses the configured public URL instead of an internal request host', () => {
    expect(publicAppUrl('/auth/magic-link/confirm', 'https://newsletter.example.com').toString()).toBe(
      'https://newsletter.example.com/auth/magic-link/confirm',
    );
  });
});

// @vitest-environment node

import { describe, expect, it } from 'vitest';
import { resolveBuildInfo } from '@/lib/build-info';

describe('application build information', () => {
  it('creates GitHub links for a build commit', () => {
    const info = resolveBuildInfo({
      NODE_ENV: 'production',
      APP_BUILD_SHA: 'AE5A6FF1234567890abcdef1234567890abcdef1',
    });

    expect(info.version).toBe('0.1.0');
    expect(info.buildId).toBe('ae5a6ff12345');
    expect(info.commitUrl).toBe(
      'https://github.com/RichardPietsch/newsletter-tool/commit/AE5A6FF1234567890abcdef1234567890abcdef1',
    );
    expect(info.compareUrl).toBe(
      'https://github.com/RichardPietsch/newsletter-tool/compare/AE5A6FF1234567890abcdef1234567890abcdef1...main',
    );
  });

  it('does not create misleading commit links without a valid revision', () => {
    const production = resolveBuildInfo({ NODE_ENV: 'production', APP_BUILD_SHA: 'unknown' });
    const development = resolveBuildInfo({ NODE_ENV: 'development' });

    expect(production.buildId).toBe('unbekannt');
    expect(production.commitUrl).toBeNull();
    expect(production.compareUrl).toBeNull();
    expect(development.buildId).toBe('development');
  });
});

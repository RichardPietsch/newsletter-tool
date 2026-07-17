import { afterEach, describe, expect, it, vi } from 'vitest';
import { logger, requestIdFrom } from '@/lib/logging/logger';

afterEach(() => vi.restoreAllMocks());

describe('structured logger', () => {
  it('writes machine-readable context at every log level', () => {
    const spies = {
      debug: vi.spyOn(console, 'debug').mockImplementation(() => undefined),
      info: vi.spyOn(console, 'info').mockImplementation(() => undefined),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => undefined),
      error: vi.spyOn(console, 'error').mockImplementation(() => undefined),
    };

    logger.debug({ event: 'test.debug' });
    logger.info({ event: 'test.info', userId: 'user-1' });
    logger.warn({ event: 'test.warn', newsletterId: 'newsletter-1' });
    logger.error({ event: 'test.error', requestId: 'request-1' });

    for (const [level, spy] of Object.entries(spies)) {
      const entry = JSON.parse(String(spy.mock.calls[0]?.[0]));
      expect(entry).toMatchObject({ level, event: `test.${level}` });
      expect(entry.timestamp).toEqual(expect.any(String));
    }
  });

  it('redacts secrets and personal authentication data recursively', () => {
    const output = vi.spyOn(console, 'info').mockImplementation(() => undefined);

    logger.info(
      { event: 'auth.test' },
      {
        token: 'plain-token',
        nested: { authorization: 'Bearer secret', email: 'person@example.com' },
        safe: 'visible',
      },
    );

    const serialized = String(output.mock.calls[0]?.[0]);
    expect(serialized).not.toContain('plain-token');
    expect(serialized).not.toContain('Bearer secret');
    expect(serialized).not.toContain('person@example.com');
    expect(JSON.parse(serialized).details).toEqual({
      token: '[REDACTED]',
      nested: { authorization: '[REDACTED]', email: '[REDACTED]' },
      safe: 'visible',
    });
  });

  it('uses an incoming request ID when available', () => {
    const request = new Request('https://example.com', { headers: { 'x-request-id': 'request-123' } });
    expect(requestIdFrom(request)).toBe('request-123');
  });
});

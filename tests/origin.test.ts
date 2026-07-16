import { describe, expect, it } from 'vitest';
import { validateMutationOrigin } from '@/lib/api/origin';

const productionEnv = { appUrl: 'https://newsletter.example.com', isProduction: true };
const developmentEnv = { appUrl: 'http://localhost:3000', isProduction: false };

function requestWithHeaders(headers: HeadersInit, url = 'https://newsletter.example.com/api/newsletters') {
  return new Request(url, { method: 'POST', headers });
}

describe('validateMutationOrigin', () => {
  it('allows requests from the configured app origin', () => {
    const response = validateMutationOrigin(requestWithHeaders({ origin: 'https://newsletter.example.com' }), productionEnv);

    expect(response).toBeNull();
  });

  it('allows requests with a same-origin referer when origin is absent', () => {
    const response = validateMutationOrigin(requestWithHeaders({ referer: 'https://newsletter.example.com/newsletters' }), productionEnv);

    expect(response).toBeNull();
  });

  it('rejects cross-origin mutation requests', async () => {
    const response = validateMutationOrigin(requestWithHeaders({ origin: 'https://evil.example' }), productionEnv);

    expect(response?.status).toBe(403);
    await expect(response?.json()).resolves.toMatchObject({ error: { code: 'FORBIDDEN' } });
  });

  it('rejects missing origins in production', async () => {
    const response = validateMutationOrigin(requestWithHeaders({}), productionEnv);

    expect(response?.status).toBe(403);
    await expect(response?.json()).resolves.toMatchObject({ error: { code: 'FORBIDDEN' } });
  });

  it('keeps local development loopback origins working', () => {
    const response = validateMutationOrigin(
      requestWithHeaders({ origin: 'http://127.0.0.1:3000' }, 'http://localhost:3000/api/newsletters'),
      developmentEnv,
    );

    expect(response).toBeNull();
  });

  it('allows missing origins in development for local scripts and tests', () => {
    const response = validateMutationOrigin(requestWithHeaders({}, 'http://localhost:3000/api/newsletters'), developmentEnv);

    expect(response).toBeNull();
  });
});

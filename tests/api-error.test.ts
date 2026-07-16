import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { apiError } from '@/lib/api/api-error';
import { parseJson } from '@/lib/api/parse-json';

describe('api errors', () => {
  it('formats structured error responses', async () => {
    const response = apiError(404, 'NOT_FOUND', 'Nicht gefunden');

    await expect(response.json()).resolves.toEqual({ error: { code: 'NOT_FOUND', message: 'Nicht gefunden' } });
    expect(response.status).toBe(404);
  });

  it('parses valid JSON payloads', async () => {
    const request = new Request('http://test.local', {
      method: 'POST',
      body: JSON.stringify({ title: 'Newsletter' }),
    });

    const parsed = await parseJson(request, z.object({ title: z.string().min(1) }));

    expect(parsed.response).toBeNull();
    expect(parsed.data).toEqual({ title: 'Newsletter' });
  });

  it('returns validation errors for invalid JSON shapes', async () => {
    const request = new Request('http://test.local', {
      method: 'POST',
      body: JSON.stringify({ title: '' }),
    });

    const parsed = await parseJson(request, z.object({ title: z.string().min(1) }));

    expect(parsed.data).toBeNull();
    expect(parsed.response?.status).toBe(400);
    await expect(parsed.response?.json()).resolves.toMatchObject({ error: { code: 'VALIDATION_ERROR' } });
  });

  it('returns bad requests for malformed JSON', async () => {
    const request = new Request('http://test.local', { method: 'POST', body: '{' });

    const parsed = await parseJson(request, z.object({ title: z.string() }));

    expect(parsed.data).toBeNull();
    expect(parsed.response?.status).toBe(400);
    await expect(parsed.response?.json()).resolves.toEqual({
      error: { code: 'BAD_REQUEST', message: 'Anfrage enthält kein gültiges JSON.' },
    });
  });
});

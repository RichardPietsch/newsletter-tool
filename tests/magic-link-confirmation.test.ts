import { describe, expect, it } from 'vitest';
import {
  createMagicLinkConfirmationProof,
  hasValidMagicLinkConfirmationProof,
  MAGIC_LINK_CONFIRMATION_COOKIE,
  mayUseMagicLinkConfirmationProof,
} from '@/lib/auth/magic-link-confirmation';

const secret = 'a-test-secret-with-at-least-thirty-two-characters';
const token = 'a'.repeat(43);

function verificationRequest(headers: HeadersInit = {}) {
  return new Request('https://newsletter.example.com/auth/magic-link/verify', {
    method: 'POST',
    headers,
  });
}

describe('magic-link confirmation proof', () => {
  it('accepts a proof that is bound to the submitted token', () => {
    const proof = createMagicLinkConfirmationProof(token, secret);
    const request = verificationRequest({ cookie: `${MAGIC_LINK_CONFIRMATION_COOKIE}=${proof}` });

    expect(hasValidMagicLinkConfirmationProof(request, token, secret)).toBe(true);
    expect(hasValidMagicLinkConfirmationProof(request, `${token}x`, secret)).toBe(false);
  });

  it('allows the proof fallback only for absent or opaque origins', () => {
    expect(mayUseMagicLinkConfirmationProof(verificationRequest({ origin: 'null' }))).toBe(true);
    expect(mayUseMagicLinkConfirmationProof(verificationRequest())).toBe(true);
    expect(
      mayUseMagicLinkConfirmationProof(verificationRequest({ origin: 'https://newsletter.example.com' })),
    ).toBe(false);
    expect(mayUseMagicLinkConfirmationProof(verificationRequest({ origin: 'https://evil.example' }))).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';
import { isEmailAllowed, normalizeEmail } from '@/lib/auth/config';
import { createSecureToken, hashToken } from '@/lib/auth/tokens';

describe('passwordless auth helpers', () => {
  it('normalizes emails and creates non-plain token hashes', () => {
    const token = createSecureToken();
    expect(token.length).toBeGreaterThan(30);
    expect(hashToken(token)).not.toBe(token);
    expect(hashToken(token)).toHaveLength(64);
    expect(normalizeEmail(' Redaktion@Example.COM ')).toBe('redaktion@example.com');
  });

  it('supports exact email and domain allow lists', () => {
    const oldEmails = process.env.AUTH_ALLOWED_EMAILS;
    const oldDomains = process.env.AUTH_ALLOWED_EMAIL_DOMAINS;
    process.env.AUTH_ALLOWED_EMAILS = 'editor@example.com';
    process.env.AUTH_ALLOWED_EMAIL_DOMAINS = 'club.example';

    expect(isEmailAllowed('editor@example.com')).toBe(true);
    expect(isEmailAllowed('person@club.example')).toBe(true);
    expect(isEmailAllowed('person@other.example')).toBe(false);

    if (oldEmails === undefined) delete process.env.AUTH_ALLOWED_EMAILS;
    else process.env.AUTH_ALLOWED_EMAILS = oldEmails;
    if (oldDomains === undefined) delete process.env.AUTH_ALLOWED_EMAIL_DOMAINS;
    else process.env.AUTH_ALLOWED_EMAIL_DOMAINS = oldDomains;
  });
});

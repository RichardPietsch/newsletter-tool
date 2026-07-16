import { describe, expect, it } from 'vitest';
import { isEmailAllowed, normalizeEmail } from '@/lib/auth/config';
import { parseServerEnv } from '@/lib/env';
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
    const env = parseServerEnv({
      NODE_ENV: 'production',
      DATABASE_URL: 'postgres://newsletter:newsletter@db:5432/newsletter',
      APP_URL: 'https://newsletter.example.com',
      AUTH_ALLOWED_EMAILS: 'editor@example.com',
      AUTH_ALLOWED_EMAIL_DOMAINS: 'club.example',
      SMTP_HOST: 'smtp.example.com',
      SMTP_USER: 'user',
      SMTP_PASSWORD: 'password',
      SMTP_FROM: 'Newsletter Tool <newsletter@example.com>',
      S3_ENDPOINT: 'http://minio:9000',
      S3_ACCESS_KEY_ID: 'access-key',
      S3_SECRET_ACCESS_KEY: 'secret-key',
      S3_BUCKET: 'newsletter-assets',
      PUBLIC_ASSET_BASE_URL: 'https://assets.example.com/newsletter-assets',
    });

    expect(isEmailAllowed('editor@example.com', env)).toBe(true);
    expect(isEmailAllowed('person@club.example', env)).toBe(true);
    expect(isEmailAllowed('person@other.example', env)).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';
import { parseServerEnv } from '@/lib/env';

const productionEnv = {
  NODE_ENV: 'production',
  DATABASE_URL: 'postgres://newsletter:newsletter@db:5432/newsletter',
  APP_URL: 'https://newsletter.example.com',
  AUTH_ALLOWED_EMAILS: 'editor@example.com',
  SMTP_HOST: 'smtp.example.com',
  SMTP_USER: 'user',
  SMTP_PASSWORD: 'password',
  SMTP_FROM: 'Newsletter Tool <newsletter@example.com>',
  S3_ENDPOINT: 'http://minio:9000',
  S3_ACCESS_KEY_ID: 'access-key',
  S3_SECRET_ACCESS_KEY: 'secret-key',
  S3_BUCKET: 'newsletter-assets',
  PUBLIC_ASSET_BASE_URL: 'https://assets.example.com/newsletter-assets',
};

describe('server environment validation', () => {
  it('keeps development defaults usable for local setups', () => {
    const env = parseServerEnv({ NODE_ENV: 'development' });

    expect(env.databaseUrl).toBe('postgres://newsletter:newsletter@localhost:5432/newsletter');
    expect(env.appUrl).toBe('http://localhost:3000');
    expect(env.s3.accessKeyId).toBe('minioadmin');
  });

  it('requires critical production settings at runtime', () => {
    expect(() => parseServerEnv({ NODE_ENV: 'production' })).toThrow(/DATABASE_URL is required in production/);
  });

  it('allows production build phase without runtime secrets', () => {
    const env = parseServerEnv({ NODE_ENV: 'production', NEXT_PHASE: 'phase-production-build' });

    expect(env.isProduction).toBe(true);
    expect(env.databaseUrl).toBe('postgres://newsletter:newsletter@localhost:5432/newsletter');
  });

  it('normalizes allow lists and parses numeric settings', () => {
    const env = parseServerEnv({
      ...productionEnv,
      AUTH_MAGIC_LINK_TTL_MINUTES: '20',
      AUTH_SESSION_DAYS: '45',
      AUTH_ALLOWED_EMAILS: ' Editor@Example.com ',
      AUTH_ALLOWED_EMAIL_DOMAINS: ' Club.Example ',
      SMTP_PORT: '465',
    });

    expect(env.auth.magicLinkTtlMinutes).toBe(20);
    expect(env.auth.sessionDays).toBe(45);
    expect(env.auth.allowedEmails).toEqual(['editor@example.com']);
    expect(env.auth.allowedEmailDomains).toEqual(['club.example']);
    expect(env.smtp.port).toBe(465);
  });
});

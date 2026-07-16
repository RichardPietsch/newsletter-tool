import { z } from 'zod';

const rawEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  NEXT_PHASE: z.string().optional(),
  DATABASE_URL: z.string().optional(),
  APP_URL: z.string().optional(),
  AUTH_COOKIE_NAME: z.string().optional(),
  AUTH_MAGIC_LINK_TTL_MINUTES: z.string().optional(),
  AUTH_SESSION_DAYS: z.string().optional(),
  AUTH_ALLOWED_EMAILS: z.string().optional(),
  AUTH_ALLOWED_EMAIL_DOMAINS: z.string().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_FROM: z.string().optional(),
  S3_ENDPOINT: z.string().optional(),
  S3_REGION: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  S3_BUCKET: z.string().optional(),
  PUBLIC_ASSET_BASE_URL: z.string().optional(),
});

const productionBuildPhase = 'phase-production-build';

function splitCsv(value: string) {
  return value
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

function assertUrl(value: string, key: string, errors: string[]) {
  try {
    new URL(value);
  } catch {
    errors.push(`${key} must be a valid URL.`);
  }
}

function readPositiveInteger(value: string, key: string, errors: string[]) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    errors.push(`${key} must be a positive integer.`);
    return 1;
  }
  return parsed;
}

export function parseServerEnv(input: NodeJS.ProcessEnv = process.env) {
  const parsed = rawEnvSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(
      `Invalid server environment:\n${parsed.error.issues.map((issue) => `- ${issue.path.join('.')}: ${issue.message}`).join('\n')}`,
    );
  }

  const raw = parsed.data;
  const errors: string[] = [];
  const isProduction = raw.NODE_ENV === 'production';
  const requireProductionValues = isProduction && raw.NEXT_PHASE !== productionBuildPhase;

  const read = (key: keyof typeof raw, fallback: string, required = requireProductionValues) => {
    const value = raw[key]?.trim();
    if (value) return value;
    if (required) errors.push(`${key} is required in production.`);
    return fallback;
  };

  const databaseUrl = read('DATABASE_URL', 'postgres://newsletter:newsletter@localhost:5432/newsletter');
  const appUrl = read('APP_URL', 'http://localhost:3000');
  const authCookieName = read('AUTH_COOKIE_NAME', 'newsletter_session', false);
  const magicLinkTtlMinutes = readPositiveInteger(
    read('AUTH_MAGIC_LINK_TTL_MINUTES', '15', false),
    'AUTH_MAGIC_LINK_TTL_MINUTES',
    errors,
  );
  const sessionDays = readPositiveInteger(read('AUTH_SESSION_DAYS', '14', false), 'AUTH_SESSION_DAYS', errors);
  const authAllowedEmails = splitCsv(read('AUTH_ALLOWED_EMAILS', '', false));
  const authAllowedEmailDomains = splitCsv(read('AUTH_ALLOWED_EMAIL_DOMAINS', '', false));
  const smtpHost = read('SMTP_HOST', 'localhost');
  const smtpPort = readPositiveInteger(read('SMTP_PORT', '1025', false), 'SMTP_PORT', errors);
  const smtpUser = read('SMTP_USER', '', requireProductionValues);
  const smtpPassword = read('SMTP_PASSWORD', '', requireProductionValues);
  const smtpFrom = read('SMTP_FROM', 'Newsletter Tool <no-reply@newsletter.local>');
  const s3Endpoint = read('S3_ENDPOINT', 'http://localhost:9000');
  const s3Region = read('S3_REGION', 'us-east-1', false);
  const s3AccessKeyId = read('S3_ACCESS_KEY_ID', 'minioadmin');
  const s3SecretAccessKey = read('S3_SECRET_ACCESS_KEY', 'minioadmin');
  const s3Bucket = read('S3_BUCKET', 'newsletter-assets');
  const publicAssetBaseUrl = read('PUBLIC_ASSET_BASE_URL', 'http://localhost:9000/newsletter-assets');

  assertUrl(appUrl, 'APP_URL', errors);
  assertUrl(s3Endpoint, 'S3_ENDPOINT', errors);
  assertUrl(publicAssetBaseUrl, 'PUBLIC_ASSET_BASE_URL', errors);

  if (requireProductionValues && authAllowedEmails.length === 0 && authAllowedEmailDomains.length === 0) {
    errors.push('AUTH_ALLOWED_EMAILS or AUTH_ALLOWED_EMAIL_DOMAINS must be configured in production.');
  }

  if (errors.length > 0) {
    throw new Error(`Invalid server environment:\n${errors.map((error) => `- ${error}`).join('\n')}`);
  }

  return {
    nodeEnv: raw.NODE_ENV,
    isProduction,
    databaseUrl,
    appUrl,
    auth: {
      cookieName: authCookieName,
      magicLinkTtlMinutes,
      sessionDays,
      allowedEmails: authAllowedEmails,
      allowedEmailDomains: authAllowedEmailDomains,
    },
    smtp: {
      host: smtpHost,
      port: smtpPort,
      user: smtpUser,
      password: smtpPassword,
      from: smtpFrom,
    },
    s3: {
      endpoint: s3Endpoint,
      region: s3Region,
      accessKeyId: s3AccessKeyId,
      secretAccessKey: s3SecretAccessKey,
      bucket: s3Bucket,
      publicAssetBaseUrl,
    },
  } as const;
}

export const serverEnv = parseServerEnv();

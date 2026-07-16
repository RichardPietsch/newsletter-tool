import { serverEnv } from '@/lib/env';

export const AUTH_COOKIE_NAME = serverEnv.auth.cookieName;
export const MAGIC_LINK_TTL_MINUTES = serverEnv.auth.magicLinkTtlMinutes;
export const SESSION_DAYS = serverEnv.auth.sessionDays;

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function isEmailAllowed(email: string, env = serverEnv) {
  const domain = email.split('@')[1] || '';
  if (env.auth.allowedEmails.length === 0 && env.auth.allowedEmailDomains.length === 0) return !env.isProduction;
  return env.auth.allowedEmails.includes(email) || env.auth.allowedEmailDomains.includes(domain);
}

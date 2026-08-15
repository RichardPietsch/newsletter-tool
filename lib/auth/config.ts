import { serverEnv } from '@/lib/env';

export const AUTH_COOKIE_NAME = serverEnv.auth.cookieName;
export const MAGIC_LINK_TTL_MINUTES = serverEnv.auth.magicLinkTtlMinutes;
export const SESSION_DAYS = serverEnv.auth.sessionDays;
export const SESSION_IDLE_HOURS = serverEnv.auth.sessionIdleHours;

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

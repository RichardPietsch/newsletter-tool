import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { NextResponse } from 'next/server';
import { unauthenticated } from '@/lib/api/api-error';
import { AUTH_COOKIE_NAME } from './cookies';
import { type AuthUser, validateSession } from './session';

export async function getCurrentUser(): Promise<AuthUser | null> {
  const jar = await cookies();
  const token = jar.get(AUTH_COOKIE_NAME)?.value;
  return token ? validateSession(token) : null;
}

export async function requirePageUser(): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  return user;
}

export async function requireApiUser(): Promise<
  { user: AuthUser; response: null } | { user: null; response: NextResponse }
> {
  const user = await getCurrentUser();
  if (!user) return { user: null, response: unauthenticated() };
  return { user, response: null };
}

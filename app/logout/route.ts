import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { AUTH_COOKIE_NAME } from '@/lib/auth/cookies';
import { revokeSession } from '@/lib/auth/session';
export async function GET(){const jar=await cookies(); const token=jar.get(AUTH_COOKIE_NAME)?.value; if(token)await revokeSession(token); jar.delete(AUTH_COOKIE_NAME); redirect('/login')}

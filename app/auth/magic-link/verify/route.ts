import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { AUTH_COOKIE_NAME, sessionCookieOptions } from '@/lib/auth/cookies';
import { verifyMagicLink } from '@/lib/auth/magic-link';
export async function GET(request:Request){const url=new URL(request.url); const token=url.searchParams.get('token'); if(!token)redirect('/login?error=invalid-or-expired'); const result=await verifyMagicLink(token,{userAgent:request.headers.get('user-agent'),ip:request.headers.get('x-forwarded-for')}); if(!result)redirect('/login?error=invalid-or-expired'); const jar=await cookies(); jar.set(AUTH_COOKIE_NAME,result.sessionToken,sessionCookieOptions()); redirect('/newsletters')}

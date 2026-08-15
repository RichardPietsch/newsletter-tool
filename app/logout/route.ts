export const dynamic = 'force-dynamic';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { AUTH_COOKIE_NAME } from '@/lib/auth/cookies';
import { revokeSession } from '@/lib/auth/session';
import { getCurrentAuthContext } from '@/lib/auth/current-user';
import { recordAuditEvent } from '@/lib/db/audit-events';
import { requestIdFrom } from '@/lib/logging/logger';
export async function GET(request: Request) {
  const context = await getCurrentAuthContext();
  const jar = await cookies();
  const token = jar.get(AUTH_COOKIE_NAME)?.value;
  if (token) await revokeSession(token);
  if (context?.mode === 'support' && context.tenant) {
    await recordAuditEvent({
      eventType: 'support.ended',
      tenantId: context.tenant.id,
      actorUserId: context.user.id,
      summary: 'Supportmodus durch Abmeldung beendet.',
      correlationId: requestIdFrom(request),
    });
  }
  jar.delete(AUTH_COOKIE_NAME);
  redirect('/login');
}

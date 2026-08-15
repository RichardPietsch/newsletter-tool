import { cookies } from 'next/headers';
import { notFound as pageNotFound, redirect } from 'next/navigation';
import { NextResponse } from 'next/server';
import { forbidden, notFound, unauthenticated } from '@/lib/api/api-error';
import { recordAuditEvent } from '@/lib/db/audit-events';
import { requestIdFrom } from '@/lib/logging/logger';
import { AUTH_COOKIE_NAME } from './cookies';
import { type AuthContext, type AuthUser, validateSession } from './session';

export async function getCurrentAuthContext(): Promise<AuthContext | null> {
  const jar = await cookies();
  const token = jar.get(AUTH_COOKIE_NAME)?.value;
  return token ? validateSession(token) : null;
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  return (await getCurrentAuthContext())?.user ?? null;
}

export async function requirePageContext(): Promise<AuthContext> {
  const context = await getCurrentAuthContext();
  if (!context) redirect('/login');
  return context;
}

export async function requirePageUser(): Promise<AuthUser> {
  return (await requirePageContext()).user;
}

export async function requireTenantPageContext(): Promise<AuthContext & { tenant: NonNullable<AuthContext['tenant']> }> {
  const context = await requirePageContext();
  if (context.mode === 'admin' || !context.tenant) redirect('/admin');
  return { ...context, tenant: context.tenant };
}

export async function requireAdminPageContext(): Promise<AuthContext> {
  const context = await requirePageContext();
  if (context.user.role !== 'platform_admin') pageNotFound();
  return context;
}

export async function requireApiContext(): Promise<
  { context: AuthContext; response: null } | { context: null; response: NextResponse }
> {
  const context = await getCurrentAuthContext();
  if (!context) return { context: null, response: unauthenticated() };
  return { context, response: null };
}

type AuditRecorder = typeof recordAuditEvent;

async function supportWriteBlocked(request: Request, context: AuthContext, recorder: AuditRecorder = recordAuditEvent) {
  await recorder({
    eventType: 'support.write_blocked',
    tenantId: context.tenant?.id,
    actorUserId: context.user.id,
    severity: 'warning',
    outcome: 'blocked',
    summary: 'Schreibversuch im Supportmodus blockiert.',
    correlationId: requestIdFrom(request),
    metadata: { method: request.method, path: new URL(request.url).pathname },
  });
  return forbidden('Der Supportmodus erlaubt ausschließlich Lesezugriffe.');
}

export async function enforceTenantApiContext(
  context: AuthContext,
  request?: Request,
  write = false,
  recorder: AuditRecorder = recordAuditEvent,
): Promise<
  | { context: AuthContext & { tenant: NonNullable<AuthContext['tenant']> }; response: null }
  | { context: null; response: NextResponse }
> {
  if (context.mode === 'admin' || !context.tenant) return { context: null, response: forbidden() };
  if (write && context.mode === 'support') {
    return { context: null, response: await supportWriteBlocked(request!, context, recorder) };
  }
  return { context: { ...context, tenant: context.tenant }, response: null };
}

export async function blockSupportMutationIfActive(request: Request) {
  const context = await getCurrentAuthContext();
  return context?.mode === 'support' ? supportWriteBlocked(request, context) : null;
}

export async function requireTenantApiContext(request?: Request, write = false): Promise<
  | { context: AuthContext & { tenant: NonNullable<AuthContext['tenant']> }; response: null }
  | { context: null; response: NextResponse }
> {
  const auth = await requireApiContext();
  if (auth.response) return auth;
  return enforceTenantApiContext(auth.context, request, write);
}

export async function requireAdminApiContext(request?: Request, write = false, allowSupportExit = false): Promise<
  { context: AuthContext; response: null } | { context: null; response: NextResponse }
> {
  const auth = await requireApiContext();
  if (auth.response) return auth;
  return enforceAdminApiContext(auth.context, request, write, allowSupportExit);
}

export async function enforceAdminApiContext(
  context: AuthContext,
  request?: Request,
  write = false,
  allowSupportExit = false,
  recorder: AuditRecorder = recordAuditEvent,
): Promise<{ context: AuthContext; response: null } | { context: null; response: NextResponse }> {
  if (context.user.role !== 'platform_admin') return { context: null, response: notFound() };
  if (write && context.mode === 'support' && !allowSupportExit) {
    return { context: null, response: await supportWriteBlocked(request!, context, recorder) };
  }
  return { context, response: null };
}

/** Compatibility helper for existing non-tenant tests and callers. */
export async function requireApiUser(): Promise<
  { user: AuthUser; response: null } | { user: null; response: NextResponse }
> {
  const auth = await requireApiContext();
  return auth.response ? { user: null, response: auth.response } : { user: auth.context.user, response: null };
}

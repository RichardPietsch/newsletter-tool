export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { badRequest, notFound } from '@/lib/api/api-error';
import { validateMutationOrigin } from '@/lib/api/origin';
import { setAccountStatus } from '@/lib/admin/operations';
import { requireAdminApiContext } from '@/lib/auth/current-user';
import { requestIdFrom } from '@/lib/logging/logger';

type Context = { params: Promise<{ id: string; userId: string }> };

export async function POST(request: Request, { params }: Context) {
  const originError = validateMutationOrigin(request);
  if (originError) return originError;
  const auth = await requireAdminApiContext(request, true);
  if (auth.response) return auth.response;
  const { id, userId } = await params;
  const form = await request.formData();
  const operation = form.get('operation');
  if (operation !== 'deactivate' && operation !== 'reactivate') return badRequest('Unbekannte Accountoperation.');
  if (form.get('confirmation') !== userId) return badRequest('Bestätigung für Statuswechsel fehlt.');
  const user = await setAccountStatus(
    id,
    userId,
    operation === 'deactivate' ? 'inactive' : 'active',
    auth.context.user,
    requestIdFrom(request),
  );
  if (!user) return notFound();
  return NextResponse.redirect(new URL(`/admin/tenants/${id}`, request.url), 303);
}

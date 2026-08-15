export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { badRequest } from '@/lib/api/api-error';
import { validateMutationOrigin } from '@/lib/api/origin';
import { createTenantAccount } from '@/lib/admin/operations';
import { requireAdminApiContext } from '@/lib/auth/current-user';
import { requestIdFrom } from '@/lib/logging/logger';

type Context = { params: Promise<{ id: string }> };
const schema = z.object({ name: z.string().trim().min(1).max(160), email: z.string().trim().email().max(320) });

export async function POST(request: Request, { params }: Context) {
  const originError = validateMutationOrigin(request);
  if (originError) return originError;
  const auth = await requireAdminApiContext(request, true);
  if (auth.response) return auth.response;
  const { id } = await params;
  const form = await request.formData();
  const parsed = schema.safeParse({ name: form.get('name'), email: form.get('email') });
  if (!parsed.success) return badRequest('Ungültige Accountdaten.');
  await createTenantAccount(id, parsed.data, auth.context.user, requestIdFrom(request));
  return NextResponse.redirect(new URL(`/admin/tenants/${id}`, request.url), 303);
}

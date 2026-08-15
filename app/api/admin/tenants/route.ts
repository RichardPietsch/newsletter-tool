export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { badRequest } from '@/lib/api/api-error';
import { validateMutationOrigin } from '@/lib/api/origin';
import { createTenant } from '@/lib/admin/operations';
import { requireAdminApiContext } from '@/lib/auth/current-user';
import { requestIdFrom } from '@/lib/logging/logger';

const schema = z.object({ name: z.string().trim().min(1).max(160), adminNotes: z.string().max(2000).optional() });

export async function POST(request: Request) {
  const originError = validateMutationOrigin(request);
  if (originError) return originError;
  const auth = await requireAdminApiContext(request, true);
  if (auth.response) return auth.response;
  const form = await request.formData();
  const parsed = schema.safeParse({ name: form.get('name'), adminNotes: form.get('adminNotes') || undefined });
  if (!parsed.success) return badRequest('Ungültige Mandantendaten.');
  const id = await createTenant(parsed.data, auth.context.user, requestIdFrom(request));
  return NextResponse.redirect(new URL(`/admin/tenants/${id}`, request.url), 303);
}

export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { publicAppUrl } from '@/lib/app-url';
import { z } from 'zod';
import { badRequest, notFound } from '@/lib/api/api-error';
import { validateMutationOrigin } from '@/lib/api/origin';
import { setTenantStatus, updateTenantDetails } from '@/lib/admin/operations';
import { requireAdminApiContext } from '@/lib/auth/current-user';
import { requestIdFrom } from '@/lib/logging/logger';
import { t } from '@/lib/i18n';

type Context = { params: Promise<{ id: string }> };

const detailsSchema = z.object({
  name: z.string().trim().min(1).max(160),
  adminNotes: z.string().max(2000).optional(),
});

export async function POST(request: Request, { params }: Context) {
  const originError = validateMutationOrigin(request);
  if (originError) return originError;
  const auth = await requireAdminApiContext(request, true);
  if (auth.response) return auth.response;
  const { id } = await params;
  const form = await request.formData();
  const operation = form.get('operation');
  if (operation === 'update') {
    const parsed = detailsSchema.safeParse({ name: form.get('name'), adminNotes: form.get('adminNotes') || undefined });
    if (!parsed.success) return badRequest(t('api.invalidTenantData'));
    if (!(await updateTenantDetails(id, parsed.data))) return notFound();
  } else if (operation === 'deactivate' || operation === 'reactivate') {
    if (form.get('confirmation') !== id) return badRequest(t('api.missingStatusConfirmation'));
    if (
      !(await setTenantStatus(
        id,
        operation === 'deactivate' ? 'inactive' : 'active',
        auth.context.user,
        requestIdFrom(request),
      ))
    ) {
      return notFound();
    }
  } else {
    return badRequest(t('api.unknownAdminOperation'));
  }
  return NextResponse.redirect(publicAppUrl(`/admin/tenants/${id}`), 303);
}

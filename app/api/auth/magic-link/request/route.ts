export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { parseJson } from '@/lib/api/parse-json';
import { validateMutationOrigin } from '@/lib/api/origin';
import { requestMagicLink } from '@/lib/auth/magic-link';
import { clientIpFrom } from '@/lib/auth/rate-limit';
import { logger, requestIdFrom } from '@/lib/logging/logger';
import { blockSupportMutationIfActive } from '@/lib/auth/current-user';

const schema = z.object({ email: z.string().email() });

export async function POST(request: Request) {
  const requestId = requestIdFrom(request);
  const supportError = await blockSupportMutationIfActive(request);
  if (supportError) return supportError;
  const originError = validateMutationOrigin(request);
  if (originError) return originError;
  const parsed = await parseJson(request, schema);
  if (parsed.response) return parsed.response;
  await requestMagicLink(parsed.data.email, {
    userAgent: request.headers.get('user-agent'),
    ip: clientIpFrom(request),
    correlationId: requestId,
  });
  logger.info({ event: 'auth.magic_link.requested', requestId });
  return NextResponse.json({ ok: true });
}

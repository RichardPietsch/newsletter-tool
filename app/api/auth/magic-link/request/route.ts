export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { parseJson } from '@/lib/api/parse-json';
import { validateMutationOrigin } from '@/lib/api/origin';
import { requestMagicLink } from '@/lib/auth/magic-link';

const schema = z.object({ email: z.string().email() });

export async function POST(request: Request) {
  const originError = validateMutationOrigin(request);
  if (originError) return originError;
  const parsed = await parseJson(request, schema);
  if (parsed.response) return parsed.response;
  await requestMagicLink(parsed.data.email, {
    userAgent: request.headers.get('user-agent'),
    ip: request.headers.get('x-forwarded-for'),
  });
  return NextResponse.json({ ok: true });
}

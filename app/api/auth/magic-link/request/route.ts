import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requestMagicLink } from '@/lib/auth/magic-link';
const schema=z.object({email:z.string().email()});
export async function POST(request:Request){const body=await request.json(); const parsed=schema.safeParse(body); if(!parsed.success)return NextResponse.json({error:'Ungültige E-Mail-Adresse'},{status:400}); await requestMagicLink(parsed.data.email,{userAgent:request.headers.get('user-agent'),ip:request.headers.get('x-forwarded-for')}); return NextResponse.json({ok:true})}

export const dynamic = 'force-dynamic';
import { redirect } from 'next/navigation';
import { getCurrentAuthContext } from '@/lib/auth/current-user';

export default async function Home() {
  const context = await getCurrentAuthContext();
  if (!context) redirect('/login');
  redirect(context.mode === 'admin' ? '/admin' : '/newsletters');
}

import Link from 'next/link';
import { requireAdminPageContext } from '@/lib/auth/current-user';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdminPageContext();
  return (
    <div className="min-h-screen bg-slate-100">
      <header className="border-b bg-slate-950 text-white">
        <div className="mx-auto flex max-w-7xl items-center gap-6 px-6 py-4">
          <Link href="/admin" className="font-semibold">Plattform-Administration</Link>
          <Link href="/admin/logs" className="text-sm text-slate-200">Ereignislogs</Link>
          <Link href="/account" className="ml-auto text-sm text-slate-200">Account</Link>
        </div>
      </header>
      {children}
    </div>
  );
}

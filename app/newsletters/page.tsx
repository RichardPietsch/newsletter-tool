import { desc, eq } from 'drizzle-orm';
import { requirePageUser } from '@/lib/auth/current-user';
import { db } from '@/lib/db';
import { newsletters } from '@/lib/db/schema';

export default async function Page() {
  const user = await requirePageUser();
  const rows = await db.select().from(newsletters).where(eq(newsletters.ownerId, user.id)).orderBy(desc(newsletters.updatedAt));
  return (
    <main className="mx-auto max-w-3xl p-8">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">Newsletter</h1>
        <a className="text-sm text-slate-600 underline" href="/account">{user.email}</a>
      </div>
      <form action="/api/newsletters" method="post">
        <button className="my-6 rounded bg-blue-700 px-4 py-2 text-white">Neuen Newsletter erstellen</button>
      </form>
      <div className="space-y-3">
        {rows.map((n) => (
          <a key={n.id} className="block rounded border bg-white p-4" href={`/newsletters/${n.id}`}>
            {n.title}
            <span className="block text-sm text-slate-500">{new Date(n.updatedAt).toLocaleString('de-DE')}</span>
          </a>
        ))}
        {rows.length === 0 && <p>Keine Newsletter vorhanden. Erstelle deinen ersten Newsletter.</p>}
      </div>
    </main>
  );
}

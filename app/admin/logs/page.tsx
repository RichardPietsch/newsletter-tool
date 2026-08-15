export const dynamic = 'force-dynamic';
import { and, desc, eq, gte, lte, type SQL } from 'drizzle-orm';
import { requireAdminPageContext } from '@/lib/auth/current-user';
import { db } from '@/lib/db';
import { auditEvents, tenants } from '@/lib/db/schema';
import { t } from '@/lib/i18n';

type Search = { tenantId?: string; eventType?: string; severity?: string; from?: string; to?: string };

export default async function AdminLogsPage({ searchParams }: { searchParams: Promise<Search> }) {
  await requireAdminPageContext();
  const search = await searchParams;
  const filters: SQL[] = [];
  if (search.tenantId) filters.push(eq(auditEvents.tenantId, search.tenantId));
  if (search.eventType) filters.push(eq(auditEvents.eventType, search.eventType));
  if (search.severity === 'info' || search.severity === 'warning' || search.severity === 'error') filters.push(eq(auditEvents.severity, search.severity));
  if (search.from && !Number.isNaN(Date.parse(search.from))) filters.push(gte(auditEvents.createdAt, new Date(search.from)));
  if (search.to && !Number.isNaN(Date.parse(search.to))) filters.push(lte(auditEvents.createdAt, new Date(`${search.to}T23:59:59.999`)));
  const [tenantRows, events] = await Promise.all([
    db.select({ id: tenants.id, name: tenants.name }).from(tenants).orderBy(tenants.name),
    db.select().from(auditEvents).where(filters.length ? and(...filters) : undefined).orderBy(desc(auditEvents.createdAt)).limit(200),
  ]);
  return (
    <main className="mx-auto max-w-7xl p-6"><h1 className="text-3xl font-bold">Ereignislogs</h1>
      <form method="get" className="mt-6 grid gap-3 rounded-xl bg-white p-4 shadow-sm md:grid-cols-5">
        <select name="tenantId" defaultValue={search.tenantId ?? ''} className="rounded border p-2"><option value="">{t('admin.allTenants')}</option>{tenantRows.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}</select>
        <input name="eventType" defaultValue={search.eventType ?? ''} placeholder="Ereignistyp" className="rounded border p-2" />
        <select name="severity" defaultValue={search.severity ?? ''} className="rounded border p-2"><option value="">{t('admin.allSeverities')}</option><option value="info">info</option><option value="warning">warning</option><option value="error">error</option></select>
        <input name="from" type="date" defaultValue={search.from ?? ''} className="rounded border p-2" />
        <div className="flex gap-2"><input name="to" type="date" defaultValue={search.to ?? ''} className="min-w-0 flex-1 rounded border p-2" /><button className="rounded bg-blue-700 px-3 text-white">Filtern</button></div>
      </form>
      <div className="mt-6 space-y-2">{events.map((event) => <article key={event.id} className="grid gap-2 rounded border bg-white p-3 text-sm md:grid-cols-[11rem_13rem_6rem_8rem_1fr]"><time>{event.createdAt.toLocaleString('de-DE')}</time><code>{event.eventType}</code><span>{event.severity}</span><span>{event.outcome}</span><div><p>{event.summary}</p><p className="mt-1 text-xs text-slate-500">Korrelation: {event.correlationId}</p></div></article>)}</div>
    </main>
  );
}

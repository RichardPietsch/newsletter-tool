export const dynamic = 'force-dynamic';
import Link from 'next/link';
import { and, count, desc, eq, gte, max } from 'drizzle-orm';
import { requireAdminPageContext } from '@/lib/auth/current-user';
import { db } from '@/lib/db';
import { auditEvents, tenants, users } from '@/lib/db/schema';
import { t } from '@/lib/i18n';

export default async function AdminPage() {
  await requireAdminPageContext();
  const tenantRows = await db.select().from(tenants).orderBy(desc(tenants.createdAt));
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const summaries = await Promise.all(
    tenantRows.map(async (tenant) => {
      const [[active], [login], [errors]] = await Promise.all([
        db
          .select({ value: count() })
          .from(users)
          .where(and(eq(users.tenantId, tenant.id), eq(users.status, 'active'))),
        db.select({ value: max(users.lastLoginAt) }).from(users).where(eq(users.tenantId, tenant.id)),
        db
          .select({ value: count() })
          .from(auditEvents)
          .where(and(eq(auditEvents.tenantId, tenant.id), eq(auditEvents.severity, 'error'), gte(auditEvents.createdAt, since))),
      ]);
      return { tenant, activeAccounts: active.value, lastLoginAt: login.value, recentErrors: errors.value };
    }),
  );

  return (
    <main className="mx-auto max-w-7xl p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Mandanten</h1>
          <p className="text-slate-600">{t('admin.closedAlphaIntro')}</p>
        </div>
      </div>

      <section className="mt-6 rounded-xl bg-white p-5 shadow-sm">
        <h2 className="text-xl font-semibold">{t('admin.createTenant')}</h2>
        <form action="/api/admin/tenants" method="post" className="mt-4 grid gap-3 md:grid-cols-[1fr_2fr_auto]">
          <input name="name" required maxLength={160} placeholder="Name" className="rounded border p-2" />
          <input name="adminNotes" maxLength={2000} placeholder={t('admin.internalNote')} className="rounded border p-2" />
          <button className="rounded bg-blue-700 px-4 py-2 text-white">Anlegen</button>
        </form>
      </section>

      <div className="mt-6 overflow-x-auto rounded-xl bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-slate-50"><tr><th className="p-3">Mandant</th><th>Status</th><th>Erstellt</th><th>{t('admin.activeAccounts')}</th><th>{t('admin.lastLogin')}</th><th>{t('admin.lastActivity')}</th><th>{t('admin.recentErrors')}</th></tr></thead>
          <tbody>
            {summaries.map(({ tenant, activeAccounts, lastLoginAt, recentErrors }) => (
              <tr key={tenant.id} className="border-b last:border-0">
                <td className="p-3"><Link className="font-medium text-blue-700" href={`/admin/tenants/${tenant.id}`}>{tenant.name}</Link></td>
                <td>{tenant.status}</td>
                <td>{tenant.createdAt.toLocaleDateString('de-DE')}</td>
                <td>{activeAccounts}</td>
                <td>{lastLoginAt?.toLocaleString('de-DE') ?? '—'}</td>
                <td>{tenant.lastActivityAt?.toLocaleString('de-DE') ?? '—'}</td>
                <td className={recentErrors > 0 ? 'font-semibold text-red-700' : ''}>{recentErrors}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}

export const dynamic = 'force-dynamic';
import { and, desc, eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { ConfirmSubmitButton } from '@/components/admin/confirm-submit-button';
import { requireAdminPageContext } from '@/lib/auth/current-user';
import { db } from '@/lib/db';
import { auditEvents, tenants, users } from '@/lib/db/schema';
import { t } from '@/lib/i18n';

export default async function TenantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPageContext();
  const { id } = await params;
  const [tenant] = await db.select().from(tenants).where(eq(tenants.id, id));
  if (!tenant) notFound();
  const [accounts, events] = await Promise.all([
    db.select().from(users).where(and(eq(users.tenantId, id), eq(users.role, 'tenant_member'))).orderBy(users.createdAt),
    db.select().from(auditEvents).where(eq(auditEvents.tenantId, id)).orderBy(desc(auditEvents.createdAt)).limit(50),
  ]);

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      <div><a href="/admin" className="text-sm text-blue-700">{t('admin.backToTenants')}</a><h1 className="mt-2 text-3xl font-bold">{tenant.name}</h1><p className="text-sm text-slate-500">{tenant.id}</p></div>

      <section className="rounded-xl bg-white p-5 shadow-sm">
        <h2 className="text-xl font-semibold">Stammdaten</h2>
        <form action={`/api/admin/tenants/${id}`} method="post" className="mt-4 space-y-3">
          <input type="hidden" name="operation" value="update" />
          <label className="block text-sm font-medium">Name<input className="mt-1 w-full rounded border p-2" name="name" defaultValue={tenant.name} required maxLength={160} /></label>
          <label className="block text-sm font-medium">{t('admin.internalAdminNotes')}<textarea className="mt-1 min-h-24 w-full rounded border p-2" name="adminNotes" defaultValue={tenant.adminNotes ?? ''} maxLength={2000} /></label>
          <button className="rounded bg-blue-700 px-4 py-2 text-white">Speichern</button>
        </form>
        <div className="mt-5 flex flex-wrap gap-3 border-t pt-5">
          <form action={`/api/admin/tenants/${id}`} method="post">
            <input type="hidden" name="operation" value={tenant.status === 'active' ? 'deactivate' : 'reactivate'} />
            <input type="hidden" name="confirmation" value={id} />
            <ConfirmSubmitButton
              message={tenant.status === 'active' ? 'Mandant und alle Accounts wirklich deaktivieren?' : 'Mandant wirklich reaktivieren?'}
              className={tenant.status === 'active' ? 'rounded bg-red-700 px-4 py-2 text-white' : 'rounded bg-green-700 px-4 py-2 text-white'}
            >{tenant.status === 'active' ? 'Mandant deaktivieren' : 'Mandant reaktivieren'}</ConfirmSubmitButton>
          </form>
          <form action="/api/admin/support" method="post">
            <input type="hidden" name="tenantId" value={id} />
            <button className="rounded border border-amber-700 px-4 py-2 text-amber-900">{t('admin.startSupport')}</button>
          </form>
        </div>
      </section>

      <section className="rounded-xl bg-white p-5 shadow-sm">
        <h2 className="text-xl font-semibold">Mitarbeiter-Accounts</h2>
        <form action={`/api/admin/tenants/${id}/accounts`} method="post" className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
          <input name="name" required maxLength={160} placeholder="Name" className="rounded border p-2" />
          <input name="email" type="email" required maxLength={320} placeholder="E-Mail" className="rounded border p-2" />
          <button className="rounded bg-blue-700 px-4 py-2 text-white">{t('admin.createAccount')}</button>
        </form>
        <div className="mt-5 divide-y">
          {accounts.map((account) => (
            <article key={account.id} className="flex flex-wrap items-center gap-3 py-3">
              <div className="min-w-64 flex-1"><p className="font-medium">{account.name || 'Ohne Namen'}</p><p className="text-sm text-slate-600">{account.email}</p></div>
              <p className="text-sm">Letzter Login: {account.lastLoginAt?.toLocaleString('de-DE') ?? '—'}</p>
              <span className="rounded bg-slate-100 px-2 py-1 text-sm">{account.status}</span>
              <form action={`/api/admin/tenants/${id}/accounts/${account.id}`} method="post">
                <input type="hidden" name="operation" value={account.status === 'active' ? 'deactivate' : 'reactivate'} />
                <input type="hidden" name="confirmation" value={account.id} />
                <ConfirmSubmitButton message={account.status === 'active' ? 'Account wirklich deaktivieren?' : 'Account wirklich reaktivieren?'} className="rounded border px-3 py-2 text-sm">
                  {account.status === 'active' ? 'Deaktivieren' : 'Reaktivieren'}
                </ConfirmSubmitButton>
              </form>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-xl bg-white p-5 shadow-sm">
        <h2 className="text-xl font-semibold">{t('admin.recentEvents')}</h2>
        <div className="mt-4 space-y-2 text-sm">
          {events.map((event) => (
            <article key={event.id} className="grid gap-2 rounded border p-3 md:grid-cols-[11rem_10rem_7rem_1fr]">
              <time>{event.createdAt.toLocaleString('de-DE')}</time><code>{event.eventType}</code><span>{event.severity}</span><p>{event.summary}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

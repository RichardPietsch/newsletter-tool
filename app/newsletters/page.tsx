import { t } from '@/lib/i18n';
export const dynamic = 'force-dynamic';
import { desc, eq } from 'drizzle-orm';
import { MdiIcon } from '@/components/editor/icons';
import { NewsletterOverviewShell } from '@/components/editor/newsletter-overview-shell';
import { requirePageUser } from '@/lib/auth/current-user';
import { db } from '@/lib/db';
import { newsletters } from '@/lib/db/schema';
import { getUserSettings } from '@/lib/settings/store';

export default async function Page() {
  const user = await requirePageUser();
  const rows = await db.select().from(newsletters).where(eq(newsletters.ownerId, user.id)).orderBy(desc(newsletters.updatedAt));
  const settings = await getUserSettings(user.id);
  const usedHeaderVariantIds = rows.flatMap((row) => {
    const document = row.document as { blocks?: Array<{ type?: string; headerVariantId?: string }> };
    return document.blocks?.filter((block) => block.type === 'header' && block.headerVariantId).map((block) => block.headerVariantId as string) ?? [];
  });

  return (
    <NewsletterOverviewShell settings={settings} usedHeaderVariantIds={Array.from(new Set(usedHeaderVariantIds))} account={{ email: user.email, lastLoginAt: user.lastLoginAt?.toISOString() ?? null }} firstNewsletterHref={rows[0] ? `/newsletters/${rows[0].id}` : undefined}>
      <main className="mx-auto max-w-3xl p-8">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-3xl font-bold">{t('misc.newslettersTitle')}</h1>
          <a className="text-sm text-slate-600 underline" href="/account">{user.email}</a>
        </div>
        <form action="/api/newsletters" method="post">
          <button className="my-6 rounded bg-blue-700 px-4 py-2 text-white">{t('misc.createNewsletter')}</button>
        </form>
        <div className="space-y-3">
          {rows.map((newsletter) => (
            <a key={newsletter.id} data-tour="newsletter-card" className="flex items-center justify-between gap-4 rounded border bg-white p-4 transition hover:border-blue-600" href={`/newsletters/${newsletter.id}`}>
              <span>
                <span className="font-medium">{newsletter.title}</span>
                <span className="block text-sm text-slate-500">{new Date(newsletter.updatedAt).toLocaleString('de-DE')}</span>
              </span>
              {newsletter.sentAt ? <span className="inline-flex items-center gap-2 rounded-full bg-green-50 px-3 py-1 text-sm font-medium text-green-700"><MdiIcon name="emailCheck" className="h-5 w-5" /> {t('misc.sent')}</span> : null}
            </a>
          ))}
          {rows.length === 0 && <p>{t('misc.noNewsletters')}</p>}
        </div>
      </main>
    </NewsletterOverviewShell>
  );
}

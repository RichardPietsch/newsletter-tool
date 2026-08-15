import './globals.css';
import { getCurrentAuthContext } from '@/lib/auth/current-user';
import { t } from '@/lib/i18n';
export const metadata = { title: 'Newsletter Tool', description: 'HTML Newsletter Editor' };
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const context = await getCurrentAuthContext();
  return (
    <html lang="de">
      <body>
        {context?.mode === 'support' && context.tenant ? (
          <aside className="sticky top-0 z-[100] flex items-center justify-between gap-4 border-b border-amber-400 bg-amber-100 px-5 py-3 text-amber-950 shadow">
            <p>
              <strong>{t('admin.supportBanner')}</strong> {context.tenant.name} ({context.tenant.id})
            </p>
            <form action="/api/admin/support/end" method="post">
              <button className="rounded border border-amber-700 bg-white px-3 py-2 font-medium">
                {t('admin.exitSupport')}
              </button>
            </form>
          </aside>
        ) : null}
        {children}
      </body>
    </html>
  );
}

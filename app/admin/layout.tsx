import Link from 'next/link';
import { requireAdminPageContext } from '@/lib/auth/current-user';
import { resolveBuildInfo } from '@/lib/build-info';
import { t } from '@/lib/i18n';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdminPageContext();
  const buildInfo = resolveBuildInfo();
  return (
    <div className="flex min-h-screen flex-col bg-slate-100">
      <header className="border-b bg-slate-950 text-white">
        <div className="mx-auto flex max-w-7xl items-center gap-6 px-6 py-4">
          <Link href="/admin" className="font-semibold">Plattform-Administration</Link>
          <Link href="/admin/logs" className="text-sm text-slate-200">Ereignislogs</Link>
          <Link href="/account" className="ml-auto text-sm text-slate-200">Account</Link>
        </div>
      </header>
      <div className="flex-1">{children}</div>
      <footer className="border-t border-slate-200 bg-white text-xs text-slate-500">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-2 gap-y-1 px-6 py-3">
          <span>{t('admin.appName')} · {t('admin.versionLabel')} {buildInfo.version}</span>
          <span aria-hidden="true">·</span>
          {buildInfo.commitUrl ? (
            <a
              href={buildInfo.commitUrl}
              target="_blank"
              rel="noreferrer"
              className="underline decoration-slate-300 underline-offset-2 hover:text-slate-800"
              title={t('admin.buildCommitTitle')}
            >
              {t('admin.buildLabel')} {buildInfo.buildId}
            </a>
          ) : (
            <span>{t('admin.buildLabel')} {buildInfo.buildId}</span>
          )}
          <span aria-hidden="true">·</span>
          <a
            href={buildInfo.compareUrl ?? buildInfo.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="underline decoration-slate-300 underline-offset-2 hover:text-slate-800"
          >
            {buildInfo.compareUrl ? t('admin.compareWithGitHub') : t('admin.github')}
          </a>
        </div>
      </footer>
    </div>
  );
}

import { t } from '@/lib/i18n';
export function LockedBlockInspector({ onOpenGlobalSettings }: { onOpenGlobalSettings: () => void }) {
  return (
    <div>
      <h2 className="font-bold">{t('misc.systemArea')}</h2>
      <p className="text-sm text-slate-600">{t('misc.lockedMvp')}</p>
      <button
        type="button"
        className="mt-4 w-full rounded border border-blue-600 px-3 py-2 text-sm text-blue-700"
        onClick={onOpenGlobalSettings}
      >
        {t('misc.manageFooterGlobally')}
      </button>
    </div>
  );
}

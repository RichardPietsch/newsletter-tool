import { t } from '@/lib/i18n';

export function LockedGlobalBadge({ className = 'mt-4' }: { className?: string }) {
  return (
    <span
      className={`newsletter-editor-ui inline-block rounded bg-slate-100 px-2 py-1 text-xs text-slate-600 ${className}`}
      data-editor-ui="locked-global"
    >
      {t('shared.lockedGlobal')}
    </span>
  );
}

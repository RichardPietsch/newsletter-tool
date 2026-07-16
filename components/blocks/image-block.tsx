import { t } from '@/lib/i18n';
import type { ImageBlock as I } from '@/lib/newsletter/schema';

export function ImageBlock({ block }: { block: I }) {
  return (
    <div className="bg-white p-6">
      {block.src ? (
        <img src={block.src} alt={block.decorative ? '' : block.alt || ''} className="block h-auto max-w-full" />
      ) : (
        <div className="rounded border border-dashed p-8 text-center text-slate-500">{t('image.choose')}</div>
      )}
    </div>
  );
}

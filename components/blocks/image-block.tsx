import { t } from '@/lib/i18n';
import type { ImageBlock as I } from '@/lib/newsletter/schema';

export function ImageBlock({ block }: { block: I }) {
  return (
    <div className="overflow-hidden rounded-[4px]">
      {block.src ? (
        <img src={block.src} alt={block.decorative ? '' : block.alt || ''} className="block h-auto w-full" />
      ) : (
        <div
          className="newsletter-editor-ui rounded border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-slate-600"
          data-editor-ui="empty-image"
        >
          {t('image.choose')}
        </div>
      )}
    </div>
  );
}

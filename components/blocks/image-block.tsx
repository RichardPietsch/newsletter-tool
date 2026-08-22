import { t } from '@/lib/i18n';
import type { ImageBlock as I } from '@/lib/newsletter/schema';
import { newsletterModuleStyles as styles } from '@/lib/newsletter/module-styles';

export function ImageBlock({ block }: { block: I }) {
  return (
    <div className="p-6 transition-colors" style={{ backgroundColor: styles.colorVariables.surface }}>
      {block.src ? (
        <img src={block.src} alt={block.decorative ? '' : block.alt || ''} className="block h-auto max-w-full" />
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

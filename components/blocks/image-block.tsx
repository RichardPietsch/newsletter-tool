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
          className="rounded border border-dashed p-8 text-center"
          style={{ borderColor: styles.colorVariables.border, color: styles.colorVariables.muted }}
        >
          {t('image.choose')}
        </div>
      )}
    </div>
  );
}

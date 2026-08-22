import type { EventBlock as E } from '@/lib/newsletter/schema';
import { newsletterModuleStyles as styles } from '@/lib/newsletter/module-styles';
export function EventBlock({ block }: { block: E }) {
  return (
    <div
      className="overflow-hidden rounded-[4px] p-6 transition-colors"
      style={{ backgroundColor: styles.colorVariables.surface, color: styles.colorVariables.text }}
    >
      <h2 className="text-xl font-bold">{block.title}</h2>
      <p className="text-sm" style={{ color: styles.colorVariables.muted }}>
        {[block.date, block.location].filter(Boolean).join(' · ')}
      </p>
      <p>{block.description}</p>
      {block.buttonUrl && (
        <span
          className="inline-block rounded px-4 py-2"
          style={{ backgroundColor: styles.colorVariables.brand, color: styles.colorVariables.featureText }}
        >
          {block.buttonLabel}
        </span>
      )}
    </div>
  );
}

import type { EventBlock as E } from '@/lib/newsletter/schema';
import { newsletterModuleStyles as styles } from '@/lib/newsletter/module-styles';
export function EventBlock({ block }: { block: E }) {
  return (
    <div
      className="overflow-hidden rounded-[4px] p-6 transition-colors"
      style={{ backgroundColor: styles.colorVariables.surface, color: styles.colorVariables.text }}
    >
      {block.category ? (
        <div
          className="mb-2 text-xs font-bold uppercase tracking-wider"
          style={{ color: styles.colorVariables.accent }}
        >
          {block.category}
        </div>
      ) : null}
      <h2 className="text-xl font-bold">{block.title}</h2>
      {block.speakerName || block.speakerRole ? (
        <p className="mt-1 text-sm font-medium" style={{ color: styles.colorVariables.muted }}>
          {[block.speakerName, block.speakerRole].filter(Boolean).join(' · ')}
        </p>
      ) : null}
      <p className="mt-2 text-sm" style={{ color: styles.colorVariables.muted }}>
        {[block.date, block.location].filter(Boolean).join(' · ')}
      </p>
      <p>{block.description}</p>
      {block.buttonUrl && (
        <span
          className="inline-block rounded px-4 py-2"
          style={{ backgroundColor: styles.colorVariables.brand, color: styles.colorVariables.brandText }}
        >
          {block.buttonLabel}
        </span>
      )}
    </div>
  );
}

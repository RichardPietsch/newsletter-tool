import type { FeaturedEventBlock as B } from '@/lib/newsletter/schema';
import { newsletterModuleStyles as styles } from '@/lib/newsletter/module-styles';

export function FeaturedEventBlock({ block }: { block: B }) {
  const isWhite = block.background === 'white';
  return (
    <div className="overflow-hidden rounded-[4px]" style={{ backgroundColor: isWhite ? styles.cardBackground : styles.navy, color: isWhite ? styles.bodyText : '#ffffff' }}>
      {block.image?.src && <img src={block.image.src} alt={block.image.decorative ? '' : block.image.alt || ''} className="h-48 w-full object-cover" />}
      <div className="flex flex-col px-8 py-7">
        <div className="text-[11px] font-bold uppercase tracking-[0.28em]" style={{ color: isWhite ? styles.red : '#cddde3' }}>{block.overline}</div>
        <h2 className="mt-3 font-serif text-3xl leading-tight">{block.title}</h2>
        {block.date && <p className="mt-5 text-sm" style={{ color: isWhite ? styles.mutedText : '#c7d4da' }}>{block.date}</p>}
        {block.description && <p className="mt-3 text-sm leading-relaxed" style={{ color: isWhite ? styles.bodyText : '#dbe5e9' }}>{block.description}</p>}
        {block.buttonUrl && <span className="mt-6 inline-block self-start px-6 py-3 text-[11px] font-bold uppercase tracking-[0.18em]" style={{ backgroundColor: isWhite ? styles.navy : '#dbe7eb', color: isWhite ? '#ffffff' : styles.navy }}>{block.buttonLabel}</span>}
      </div>
    </div>
  );
}

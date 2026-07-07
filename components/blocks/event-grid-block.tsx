import type { EventGridBlock, EventItem } from '@/lib/newsletter/schema';
import { newsletterModuleStyles as styles } from '@/lib/newsletter/module-styles';

function Card({ item, wide }: { item: EventItem; wide?: boolean }) {
  return (
    <article className={wide ? 'md:col-span-2' : ''} style={{ backgroundColor: styles.cardBackground }}>
      {item.image?.src && <img src={item.image.src} alt={item.image.decorative ? '' : item.image.alt || ''} style={{ height: styles.eventGrid.imageHeight }} className="w-full object-cover" />}
      <div style={{ padding: styles.eventGrid.cardPadding }}>
        <div className="text-[10px] font-bold uppercase tracking-[0.24em]" style={{ color: styles.red }}>{item.category}</div>
        <h3 className="mt-3 font-serif text-xl leading-tight" style={{ color: styles.serifText }}>{item.title}</h3>
        {(item.date || item.location) && <p className="mt-3 text-sm" style={{ color: styles.mutedText }}>{[item.date, item.location].filter(Boolean).join(' · ')}</p>}
        {item.description && <p className="mt-3 text-sm leading-relaxed" style={{ color: styles.bodyText }}>{item.description}</p>}
        {item.buttonUrl && <span className="mt-5 inline-block border px-4 py-2 text-[10px] font-bold uppercase tracking-[0.16em]" style={{ borderColor: styles.navy, color: styles.navy }}>{item.buttonLabel}</span>}
      </div>
    </article>
  );
}

export function EventGridBlock({ block }: { block: EventGridBlock }) {
  return (
    <div style={{ backgroundColor: styles.newsletterBackground, padding: `${styles.eventGrid.outerPaddingY}px ${styles.eventGrid.outerPaddingX}px` }}>
      {block.heading && <div className="mb-4 px-2 text-[11px] font-bold uppercase tracking-[0.28em]" style={{ color: styles.red }}>{block.heading}</div>}
      <div className="grid md:grid-cols-2" style={{ gap: styles.eventGrid.gap }}>
        {block.items.map((item, index) => <Card key={item.id} item={item} wide={block.items.length % 2 === 1 && index === block.items.length - 1} />)}
      </div>
    </div>
  );
}

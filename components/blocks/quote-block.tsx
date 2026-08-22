import type { QuoteBlock as B } from '@/lib/newsletter/schema';
import { newsletterModuleStyles as styles } from '@/lib/newsletter/module-styles';
export function QuoteBlock({ block }: { block: B }) {
  return (
    <div className="px-8 py-7 transition-colors" style={{ backgroundColor: styles.colorVariables.surface }}>
      <div className="border-l-4 pl-6" style={{ borderColor: styles.colorVariables.accent }}>
        <blockquote className="font-serif text-xl italic leading-relaxed" style={{ color: styles.colorVariables.text }}>
          „{block.quote}“
        </blockquote>
        {(block.author || block.role) && (
          <p
            className="mt-4 text-[11px] font-bold uppercase tracking-[0.18em]"
            style={{ color: styles.colorVariables.accent }}
          >
            {[block.author, block.role].filter(Boolean).join(' · ')}
          </p>
        )}
      </div>
    </div>
  );
}

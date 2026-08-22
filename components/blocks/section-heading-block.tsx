import type { SectionHeadingBlock as B } from '@/lib/newsletter/schema';
import { newsletterModuleStyles as styles } from '@/lib/newsletter/module-styles';
export function SectionHeadingBlock({ block }: { block: B }) {
  return (
    <div className="px-8 py-5 transition-colors" style={{ backgroundColor: styles.colorVariables.background }}>
      <div
        className="text-[11px] font-bold uppercase tracking-[0.28em]"
        style={{ color: styles.colorVariables.accent }}
      >
        {block.label}
      </div>
    </div>
  );
}

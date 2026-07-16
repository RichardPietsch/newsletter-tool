import type { SectionHeadingBlock as B } from '@/lib/newsletter/schema';
export function SectionHeadingBlock({ block }: { block: B }) {
  return (
    <div className="bg-[#f4f1ec] px-8 py-5">
      <div className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#a63a3a]">{block.label}</div>
    </div>
  );
}

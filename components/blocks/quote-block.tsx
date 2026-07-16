import type { QuoteBlock as B } from '@/lib/newsletter/schema';
export function QuoteBlock({ block }: { block: B }) {
  return (
    <div className="bg-white px-8 py-7">
      <div className="border-l-4 border-[#b23a36] pl-6">
        <blockquote className="font-serif text-xl italic leading-relaxed text-[#17303d]">„{block.quote}“</blockquote>
        {(block.author || block.role) && (
          <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.18em] text-[#a63a3a]">
            {[block.author, block.role].filter(Boolean).join(' · ')}
          </p>
        )}
      </div>
    </div>
  );
}

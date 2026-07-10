import type { FeaturedEventBlock as B } from '@/lib/newsletter/schema';

export function FeaturedEventBlock({ block }: { block: B }) {
  return (
    <div className="bg-[#17303d] text-white">
      {block.image?.src && <img src={block.image.src} alt={block.image.decorative ? '' : block.image.alt || ''} className="h-48 w-full object-cover" />}
      <div className="flex flex-col px-8 py-7">
        <div className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#cddde3]">{block.overline}</div>
        <h2 className="mt-3 font-serif text-3xl leading-tight">{block.title}</h2>
        {block.date && <p className="mt-5 text-sm text-[#c7d4da]">{block.date}</p>}
        {block.description && <p className="mt-3 text-sm leading-relaxed text-[#dbe5e9]">{block.description}</p>}
        {block.buttonUrl && <span className="mt-6 inline-block self-start bg-[#dbe7eb] px-6 py-3 text-[11px] font-bold uppercase tracking-[0.18em] text-[#17303d]">{block.buttonLabel}</span>}
      </div>
    </div>
  );
}

import type { FeaturedEventBlock as B } from '@/lib/newsletter/schema';
import { newsletterModuleStyles as styles } from '@/lib/newsletter/module-styles';

export function FeaturedEventBlock({ block }: { block: B }) {
  const isWhite = block.background === 'white';
  const colors = styles.colorVariables;
  return (
    <div
      className="overflow-hidden rounded-[4px]"
      style={{
        backgroundColor: isWhite ? colors.surface : colors.featureBackground,
        color: isWhite ? colors.text : colors.featureText,
      }}
    >
      {block.image?.src && (
        <img
          src={block.image.src}
          alt={block.image.decorative ? '' : block.image.alt || ''}
          className="h-48 w-full object-cover"
        />
      )}
      <div className="flex flex-col px-8 py-7">
        <div
          className="text-[11px] font-bold uppercase tracking-[0.28em]"
          style={{ color: isWhite ? colors.accent : colors.featureAccent }}
        >
          {block.overline}
        </div>
        <h2 className="mt-3 font-serif text-3xl leading-tight">{block.title}</h2>
        {block.speakerName || block.speakerRole ? (
          <p className="mt-2 text-sm font-medium" style={{ color: isWhite ? colors.muted : colors.featureMuted }}>
            {[block.speakerName, block.speakerRole].filter(Boolean).join(' · ')}
          </p>
        ) : null}
        {block.date || block.location ? (
          <p className="mt-5 text-sm" style={{ color: isWhite ? colors.muted : colors.featureMuted }}>
            {[block.date, block.location].filter(Boolean).join(' · ')}
          </p>
        ) : null}
        {block.description && (
          <p className="mt-3 text-sm leading-relaxed" style={{ color: isWhite ? colors.text : colors.featureMuted }}>
            {block.description}
          </p>
        )}
        {block.buttonUrl && (
          <span
            className="mt-6 inline-block self-start px-6 py-3 text-[11px] font-bold uppercase tracking-[0.18em]"
            style={{
              backgroundColor: isWhite ? colors.featureBackground : colors.featureButtonBackground,
              color: isWhite ? colors.featureText : colors.featureButtonText,
            }}
          >
            {block.buttonLabel}
          </span>
        )}
      </div>
    </div>
  );
}

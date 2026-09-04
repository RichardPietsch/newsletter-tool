import { ROUNDED_HEADER_IMAGE_RADIUS_PX, type GlobalSettings } from '@/lib/settings/schema';
import { newsletterModuleStyles as styles } from '@/lib/newsletter/module-styles';
import { LockedGlobalBadge } from '@/components/editor/locked-global-badge';

export function HeaderBlock({
  branding,
  settings,
  headerVariantId,
  squareBottom = false,
}: {
  branding: string;
  settings?: GlobalSettings;
  headerVariantId?: string;
  squareBottom?: boolean;
}) {
  const variant = settings?.headerVariants.find((item) => item.id === headerVariantId) ?? settings?.headerVariants[0];

  return (
    <div
      className={`mt-6 overflow-hidden px-8 py-5 text-center transition-colors ${squareBottom ? 'rounded-t-[4px]' : 'rounded-[4px]'}`}
      style={{ backgroundColor: styles.colorVariables.surface, color: styles.colorVariables.text }}
    >
      {variant ? (
        <img
          src={variant.imageUrl}
          alt={variant.alt}
          className="mx-auto w-full max-w-[200px] object-contain"
          style={{ borderRadius: variant.roundedCorners ? ROUNDED_HEADER_IMAGE_RADIUS_PX : 0 }}
        />
      ) : (
        <div className="text-center text-xl font-bold" style={{ color: styles.colorVariables.brand }}>
          {branding}
        </div>
      )}
      <LockedGlobalBadge />
    </div>
  );
}

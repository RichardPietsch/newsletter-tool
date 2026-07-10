import type { GlobalSettings } from '@/lib/settings/schema';

export function HeaderBlock({ branding, settings, headerVariantId }: { branding: string; settings?: GlobalSettings; headerVariantId?: string }) {
  const variant = settings?.headerVariants.find((item) => item.id === headerVariantId) ?? settings?.headerVariants[0];

  return (
    <div className="bg-white px-8 py-5 text-center">
      {variant ? <img src={variant.imageUrl} alt={variant.alt} className="mx-auto w-full max-w-[200px] object-contain" /> : <div className="text-center text-xl font-bold text-blue-700">{branding}</div>}
      <span className="mt-4 inline-block rounded bg-slate-100 px-2 py-1 text-xs">Gesperrt · global konfiguriert</span>
    </div>
  );
}

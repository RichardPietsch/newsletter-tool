import type { GlobalSettings } from '@/lib/settings/schema';

export function HeaderBlock({ branding, settings, headerVariantId }: { branding: string; settings?: GlobalSettings; headerVariantId?: string }) {
  const variant = settings?.headerVariants.find((item) => item.id === headerVariantId);

  return (
    <div className="bg-white p-8">
      {variant ? <img src={variant.imageUrl} alt={variant.alt} className="max-h-28 w-full object-contain" /> : <div className="text-2xl font-bold text-blue-700">{branding}</div>}
      <div className="mt-4 border-t" />
      <span className="mt-2 inline-block rounded bg-slate-100 px-2 py-1 text-xs">Gesperrt · global konfiguriert</span>
    </div>
  );
}

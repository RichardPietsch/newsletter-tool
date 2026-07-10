'use client';

import type { HeaderBlock } from '@/lib/newsletter/schema';
import type { GlobalSettings } from '@/lib/settings/schema';

export function HeaderInspector({ block, settings, onChange }: { block: HeaderBlock; settings?: GlobalSettings; onChange: (patch: Partial<HeaderBlock>) => void }) {
  const variants = settings?.headerVariants ?? [];
  const selectedVariantId = variants.find((variant) => variant.id === block.headerVariantId)?.id ?? variants[0]?.id ?? '';

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-bold">Header</h2>
        <p className="text-sm text-slate-600">Der Header ist global gestaltet. In diesem Newsletter kannst du auswählen, welche konfigurierte Header-Variante verwendet wird.</p>
      </div>
      <label className="block text-sm font-medium">
        Header-Variante
        <select className="mt-2 w-full rounded border p-2" value={selectedVariantId} disabled={variants.length === 0} onChange={(event) => onChange({ headerVariantId: event.target.value })}>
          {variants.map((variant) => (
            <option key={variant.id} value={variant.id}>{variant.name}</option>
          ))}
        </select>
      </label>
      {(settings?.headerVariants.length ?? 0) === 0 && <p className="rounded border border-dashed p-3 text-sm text-slate-600">Lege in den globalen Einstellungen zuerst Header-Varianten per Bild-Upload an.</p>}
    </div>
  );
}

import { SettingsEditor } from '@/components/settings/settings-editor';
import { db } from '@/lib/db';
import { newsletters } from '@/lib/db/schema';
import { getGlobalSettings } from '@/lib/settings/store';

export default async function SettingsPage() {
  const settings = await getGlobalSettings();
  const rows = await db.select({ document: newsletters.document }).from(newsletters);
  const usedHeaderVariantIds = rows.flatMap((row) => {
    const document = row.document as { blocks?: Array<{ type?: string; headerVariantId?: string }> };
    return document.blocks?.filter((block) => block.type === 'header' && block.headerVariantId).map((block) => block.headerVariantId as string) ?? [];
  });

  return <SettingsEditor initialSettings={settings} usedHeaderVariantIds={Array.from(new Set(usedHeaderVariantIds))} />;
}

export const dynamic = 'force-dynamic';
import { eq } from 'drizzle-orm';
import { SettingsEditor } from '@/components/settings/settings-editor';
import { requireTenantPageContext } from '@/lib/auth/current-user';
import { db } from '@/lib/db';
import { newsletters } from '@/lib/db/schema';
import { getTenantSettings } from '@/lib/settings/store';

export default async function SettingsPage() {
  const context = await requireTenantPageContext();
  const settings = await getTenantSettings(context.tenant.id);
  const rows = await db
    .select({ document: newsletters.document })
    .from(newsletters)
    .where(eq(newsletters.tenantId, context.tenant.id));
  const usedHeaderVariantIds = rows.flatMap((row) => {
    const document = row.document as { blocks?: Array<{ type?: string; headerVariantId?: string }> };
    return (
      document.blocks
        ?.filter((block) => block.type === 'header' && block.headerVariantId)
        .map((block) => block.headerVariantId as string) ?? []
    );
  });

  return (
    <SettingsEditor
      initialSettings={settings}
      usedHeaderVariantIds={Array.from(new Set(usedHeaderVariantIds))}
      readOnly={context.mode === 'support'}
    />
  );
}

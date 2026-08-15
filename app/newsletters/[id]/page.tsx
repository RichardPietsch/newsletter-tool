export const dynamic = 'force-dynamic';
import { notFound } from 'next/navigation';
import { and, eq } from 'drizzle-orm';
import { EditorShell } from '@/components/editor/editor-shell';
import { requireTenantPageContext } from '@/lib/auth/current-user';
import { db } from '@/lib/db';
import { newsletters } from '@/lib/db/schema';
import { migrateNewsletterDocument } from '@/lib/newsletter/migrations';
import { getTenantSettings } from '@/lib/settings/store';

type NewsletterPageProps = {
  params: Promise<{ id: string }>;
};

export default async function Page({ params }: NewsletterPageProps) {
  const context = await requireTenantPageContext();
  const { id } = await params;
  const [newsletter] = await db
    .select()
    .from(newsletters)
    .where(and(eq(newsletters.id, id), eq(newsletters.tenantId, context.tenant.id)));

  if (!newsletter) {
    notFound();
  }

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
    <EditorShell
      id={newsletter.id}
      document={migrateNewsletterDocument(newsletter.document)}
      settings={settings}
      usedHeaderVariantIds={Array.from(new Set(usedHeaderVariantIds))}
      sentAt={newsletter.sentAt?.toISOString() ?? null}
      forceReadOnly={context.mode === 'support'}
      account={{ email: context.user.email, lastLoginAt: context.user.lastLoginAt?.toISOString() ?? null }}
    />
  );
}

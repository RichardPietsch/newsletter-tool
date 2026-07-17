export const dynamic = 'force-dynamic';
import { notFound } from 'next/navigation';
import { and, eq } from 'drizzle-orm';
import { EditorShell } from '@/components/editor/editor-shell';
import { requirePageUser } from '@/lib/auth/current-user';
import { db } from '@/lib/db';
import { newsletters } from '@/lib/db/schema';
import { migrateNewsletterDocument } from '@/lib/newsletter/migrations';
import { getUserSettings } from '@/lib/settings/store';

type NewsletterPageProps = {
  params: Promise<{ id: string }>;
};

export default async function Page({ params }: NewsletterPageProps) {
  const user = await requirePageUser();
  const { id } = await params;
  const [newsletter] = await db
    .select()
    .from(newsletters)
    .where(and(eq(newsletters.id, id), eq(newsletters.ownerId, user.id)));

  if (!newsletter) {
    notFound();
  }

  const settings = await getUserSettings(user.id);
  const rows = await db
    .select({ document: newsletters.document })
    .from(newsletters)
    .where(eq(newsletters.ownerId, user.id));
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
      account={{ email: user.email, lastLoginAt: user.lastLoginAt?.toISOString() ?? null }}
    />
  );
}

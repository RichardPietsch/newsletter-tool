import { notFound } from 'next/navigation';
import { and, eq } from 'drizzle-orm';
import { EditorShell } from '@/components/editor/editor-shell';
import { requirePageUser } from '@/lib/auth/current-user';
import { db } from '@/lib/db';
import { newsletters } from '@/lib/db/schema';
import { newsletterDocumentSchema } from '@/lib/newsletter/schema';
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

  return <EditorShell id={newsletter.id} document={newsletterDocumentSchema.parse(newsletter.document)} settings={settings} />;
}

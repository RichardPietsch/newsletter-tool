import { notFound } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { EditorShell } from '@/components/editor/editor-shell';
import { db } from '@/lib/db';
import { newsletters } from '@/lib/db/schema';
import { newsletterDocumentSchema } from '@/lib/newsletter/schema';
import { getGlobalSettings } from '@/lib/settings/store';

type NewsletterPageProps = {
  params: Promise<{ id: string }>;
};

export default async function Page({ params }: NewsletterPageProps) {
  const { id } = await params;
  const [newsletter] = await db.select().from(newsletters).where(eq(newsletters.id, id));

  if (!newsletter) {
    notFound();
  }

  const settings = await getGlobalSettings();

  return <EditorShell id={newsletter.id} document={newsletterDocumentSchema.parse(newsletter.document)} settings={settings} />;
}

import type { GlobalSettings } from '@/lib/settings/schema';

function plainTextFromDoc(doc: GlobalSettings['footerRichText']) {
  return (doc.content ?? [])
    .map((node: any) => (node.content ?? []).map((child: any) => child.text ?? '').join(''));
}

export function FooterBlock({ contact, legal, settings }: { contact: string; legal: string; settings?: GlobalSettings }) {
  const lines = settings ? plainTextFromDoc(settings.footerRichText) : [contact, legal];

  return (
    <div className="bg-white p-8 text-center text-sm text-slate-500">
      <div className="mb-4 border-t" />
      {lines.map((line, index) => <p key={`${line}-${index}`} className={line ? undefined : 'h-4'}>{line}</p>)}
      <span className="mt-2 inline-block rounded bg-slate-100 px-2 py-1 text-xs">Gesperrt · global konfiguriert</span>
    </div>
  );
}

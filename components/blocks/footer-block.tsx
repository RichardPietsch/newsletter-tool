import { t } from '@/lib/i18n';
import type { ReactNode } from 'react';
import type { GlobalSettings } from '@/lib/settings/schema';

type RichTextNode = {
  type?: string;
  text?: string;
  marks?: Array<{ type: string; attrs?: Record<string, string> }>;
  content?: RichTextNode[];
};

function renderMarkedText(text: string, marks: RichTextNode['marks'], key: string): ReactNode {
  return (marks ?? []).reduce<ReactNode>((current, mark, index) => {
    if (mark.type === 'bold') return <strong key={`${key}-bold-${index}`}>{current}</strong>;
    if (mark.type === 'link')
      return (
        <a key={`${key}-link-${index}`} href={mark.attrs?.href ?? '#'} className="underline">
          {current}
        </a>
      );
    return current;
  }, text);
}

function renderInlineNodes(nodes: RichTextNode[] = [], prefix = 'node'): ReactNode[] {
  return nodes.map((node, index) => {
    const key = `${prefix}-${index}`;
    if (node.type === 'text') return renderMarkedText(node.text ?? '', node.marks, key);
    if (node.type === 'hardBreak') return <br key={key} />;
    return renderInlineNodes(node.content, key);
  });
}

function paragraphHasContent(node: RichTextNode) {
  return (node.content ?? []).some((child) => Boolean(child.text));
}

function footerParagraphs(doc: GlobalSettings['footerRichText']) {
  return (doc.content ?? []) as RichTextNode[];
}

export function FooterBlock({
  contact,
  legal,
  settings,
}: {
  contact: string;
  legal: string;
  settings?: GlobalSettings;
}) {
  const paragraphs = settings
    ? footerParagraphs(settings.footerRichText)
    : [
        { type: 'paragraph', content: [{ type: 'text', text: contact }] },
        { type: 'paragraph', content: [{ type: 'text', text: legal }] },
      ];

  return (
    <div className="p-8 text-center text-sm text-slate-500">
      {paragraphs.map((paragraph, index) => (
        <p key={index} className={paragraphHasContent(paragraph) ? undefined : 'h-4'}>
          {renderInlineNodes(paragraph.content, `footer-${index}`)}
        </p>
      ))}
      <span className="mt-2 inline-block rounded bg-slate-100 px-2 py-1 text-xs">{t('shared.lockedGlobal')}</span>
    </div>
  );
}

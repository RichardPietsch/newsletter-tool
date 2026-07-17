import type { GlobalSettings } from '@/lib/settings/schema';
import type { TiptapMark, TiptapNode } from '@/lib/newsletter/schema';

function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (match) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[match]!,
  );
}

function renderMarkedText(text: string, marks: TiptapMark[] = []) {
  return marks.reduce((current, mark) => {
    if (mark.type === 'bold') return `<strong>${current}</strong>`;
    if (mark.type === 'link') return `<a href="${escapeHtml(mark.attrs?.href ?? '#')}">${current}</a>`;
    return current;
  }, escapeHtml(text));
}

function renderNodes(nodes: TiptapNode[] = []): string {
  return nodes
    .map((node) => {
      if (node.type === 'text') return renderMarkedText(node.text, node.marks);
      if (node.type === 'hardBreak') return '<br />';
      if (node.type === 'paragraph') return `<p style="margin:0 0 4px">${renderNodes(node.content)}</p>`;
      if ('content' in node) return renderNodes(node.content);
      return '';
    })
    .join('');
}

export function renderFooter(contact: string, legal: string, settings?: GlobalSettings) {
  const content = settings
    ? renderNodes(settings.footerRichText.content)
    : `${escapeHtml(contact)}<br/>${escapeHtml(legal)}`;
  return `<mj-section padding="16px 24px 32px"><mj-column><mj-text align="center" font-size="12px" color="#5d6b82" line-height="1.5" padding="0">${content}</mj-text></mj-column></mj-section>`;
}

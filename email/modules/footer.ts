import type { GlobalSettings } from '@/lib/settings/schema';
import type { TiptapMark, TiptapNode } from '@/lib/newsletter/schema';
import { newsletterEmailClasses as classes, newsletterModuleStyles as styles } from '@/lib/newsletter/module-styles';

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
      if (node.type === 'blockquote')
        return `<blockquote style="margin:8px 0;padding-left:12px;border-left:3px solid currentColor;font-style:italic">${renderNodes(node.content)}</blockquote>`;
      if ('content' in node) return renderNodes(node.content);
      return '';
    })
    .join('');
}

export function renderFooter(contact: string, legal: string, settings?: GlobalSettings) {
  const colors = settings?.colors.light ?? styles.colors;
  const content = settings
    ? renderNodes(settings.footerRichText.content)
    : `${escapeHtml(contact)}<br/>${escapeHtml(legal)}`;
  return `<mj-section css-class="${classes.background}" background-color="${colors.background}" padding="16px 24px 32px"><mj-column><mj-text css-class="${classes.muted}" align="center" font-size="12px" color="${colors.muted}" line-height="1.5" padding="0">${content}</mj-text></mj-column></mj-section>`;
}

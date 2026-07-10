import type { GlobalSettings } from '@/lib/settings/schema';

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (match) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[match]!);
}

function renderNodes(nodes: any[] = []): string {
  return nodes.map((node) => {
    if (node.type === 'text') return escapeHtml(node.text ?? '');
    if (node.type === 'hardBreak') return '<br />';
    if (node.type === 'paragraph') return `<p>${renderNodes(node.content)}</p>`;
    return renderNodes(node.content);
  }).join('');
}

export function renderFooter(contact: string, legal: string, settings?: GlobalSettings) {
  const content = settings ? renderNodes(settings.footerRichText.content) : `${escapeHtml(contact)}<br/>${escapeHtml(legal)}`;
  return `<mj-section background-color="#ffffff" padding="20px 24px 32px"><mj-column><mj-divider border-color="#d7dee8" /><mj-text align="center" font-size="12px" color="#5d6b82" line-height="1.5">${content}</mj-text></mj-column></mj-section>`;
}

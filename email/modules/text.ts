import type { TextBlock } from '@/lib/newsletter/schema';

function esc(value: string) {
  return value.replace(/[&<>"']/g, (match) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[match]!);
}

function renderNodes(items: any[] = []): string {
  return items.map((node) => {
    if (node.type === 'text') {
      let text = esc(node.text || '');
      for (const mark of node.marks || []) {
        if (mark.type === 'bold') text = `<strong>${text}</strong>`;
        if (mark.type === 'italic') text = `<em>${text}</em>`;
        if (mark.type === 'underline') text = `<u>${text}</u>`;
        if (mark.type === 'textStyle' && mark.attrs?.color === '#dc2626') text = `<span style="color:#dc2626">${text}</span>`;
        if (mark.type === 'link') text = `<a href="${esc(mark.attrs?.href || '#')}">${text}</a>`;
      }
      return text;
    }
    if (node.type === 'hardBreak') return '<br />';
    if (node.type === 'bulletList') return `<ul>${renderNodes(node.content)}</ul>`;
    if (node.type === 'orderedList') return `<ol>${renderNodes(node.content)}</ol>`;
    if (node.type === 'listItem') return `<li>${renderNodes(node.content)}</li>`;
    const tag = node.type === 'heading' ? `h${node.attrs?.level === 3 ? 3 : 2}` : 'p';
    return `<${tag}>${renderNodes(node.content)}</${tag}>`;
  }).join('');
}

export function renderText(block: TextBlock) {
  return `<mj-section background-color="#ffffff"><mj-column><mj-text font-size="16px" line-height="1.6" color="#172033">${renderNodes(block.content.content)}</mj-text></mj-column></mj-section>`;
}

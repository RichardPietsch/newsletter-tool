import type { TextBlock } from '@/lib/newsletter/schema';
import { newsletterModuleStyles as styles } from '@/lib/newsletter/module-styles';

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
        if (mark.type === 'textStyle' && ['#dc2626', '#6d7478', '#111827'].includes(mark.attrs?.color)) text = `<span style="color:${mark.attrs.color}">${text}</span>`;
        if (mark.type === 'link') text = `<a href="${esc(mark.attrs?.href || '#')}">${text}</a>`;
      }
      return text;
    }
    if (node.type === 'hardBreak') return '<br />';
    if (node.type === 'bulletList') return `<ul style="margin:0 0 12px 20px; padding:0">${renderNodes(node.content)}</ul>`;
    if (node.type === 'orderedList') return `<ol style="margin:0 0 12px 20px; padding:0">${renderNodes(node.content)}</ol>`;
    if (node.type === 'listItem') return `<li>${renderNodes(node.content)}</li>`;
    const tag = node.type === 'heading' ? `h${node.attrs?.level === 3 ? 3 : 2}` : 'p';
    const margin = tag === 'p' ? 'margin:0 0 12px' : 'margin:0 0 14px';
    const typography = tag === 'p' ? 'font-size:14px;line-height:1.8' : 'font-family:Georgia, Times, serif;font-weight:400;line-height:1.25';
    return `<${tag} style="${margin};${typography}">${renderNodes(node.content)}</${tag}>`;
  }).join('');
}

export function renderText(block: TextBlock) {
  const isBlue = block.background === 'blue';
  return `<mj-section background-color="${isBlue ? styles.navy : styles.cardBackground}" padding="0"><mj-column><mj-text font-size="14px" line-height="1.8" color="${isBlue ? '#ffffff' : '#172033'}" padding="24px 32px 20px">${renderNodes(block.content.content)}</mj-text></mj-column></mj-section>`;
}

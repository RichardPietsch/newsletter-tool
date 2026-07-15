import type { TextBlock } from '@/lib/newsletter/schema';
import { newsletterModuleStyles as styles } from '@/lib/newsletter/module-styles';

function esc(value: string) {
  return value.replace(/[&<>"']/g, (match) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[match]!);
}

function renderNodes(items: any[] = []): string {
  return items.map((node, index) => {
    if (node.type === 'text') {
      let text = esc(node.text || '');
      for (const mark of node.marks || []) {
        if (mark.type === 'bold') text = `<strong>${text}</strong>`;
        if (mark.type === 'italic') text = `<em>${text}</em>`;
        if (mark.type === 'underline') text = `<u>${text}</u>`;
        if (mark.type === 'textStyle') {
          const rawColor = mark.attrs?.color;
          if (rawColor && ['#dc2626', '#6d7478', '#17303d', '#111827'].includes(rawColor)) {
            const color = rawColor === '#111827' ? styles.navy : rawColor;
            text = `<span style="color:${color}">${text}</span>`;
          }
        }
        if (mark.type === 'link') text = `<a href="${esc(mark.attrs?.href || '#')}">${text}</a>`;
      }
      return text;
    }
    if (node.type === 'hardBreak') return '<br />';
    if (node.type === 'bulletList') return `<ul style="margin:0 0 12px 20px; padding:0">${renderNodes(node.content)}</ul>`;
    if (node.type === 'orderedList') return `<ol style="margin:0 0 12px 20px; padding:0">${renderNodes(node.content)}</ol>`;
    if (node.type === 'listItem') return `<li>${renderNodes(node.content)}</li>`;
    const tag = node.type === 'heading' ? `h${node.attrs?.level === 3 ? 3 : 2}` : 'p';
    const previousNode = items[index - 1];
    const followsHeading = tag === 'p' && previousNode?.type === 'heading';
    const margin = tag === 'p' ? `margin:${followsHeading ? '8px' : '0'} 0 12px` : 'margin:0 0 8px';
    const typography = tag === 'p' ? 'font-size:14px;line-height:1.8' : 'font-family:Georgia, Times, serif;font-weight:400;line-height:1.25';
    return `<${tag} style="${margin};${typography}">${renderNodes(node.content)}</${tag}>`;
  }).join('');
}

export function renderText(block: TextBlock, options: { squareTop?: boolean } = {}) {
  const isBlue = block.background === 'blue';
  const radius = options.squareTop ? '0 0 4px 4px' : '4px';
  return `<mj-section background-color="${isBlue ? styles.navy : styles.cardBackground}" padding="0" border-radius="${radius}"><mj-column border-radius="${radius}"><mj-text font-size="14px" line-height="1.8" color="${isBlue ? '#ffffff' : styles.navy}" padding="24px 32px 20px">${renderNodes(block.content.content)}</mj-text></mj-column></mj-section>`;
}

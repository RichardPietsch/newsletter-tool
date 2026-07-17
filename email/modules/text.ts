import { allowedTextColors, type TextBlock, type TiptapMark, type TiptapNode } from '@/lib/newsletter/schema';
import { newsletterModuleStyles as styles } from '@/lib/newsletter/module-styles';

function esc(value: string) {
  return value.replace(
    /[&<>"']/g,
    (match) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[match]!,
  );
}

function renderMarks(text: string, marks: TiptapMark[] = []) {
  return marks.reduce((current, mark) => {
    if (mark.type === 'bold') return `<strong>${current}</strong>`;
    if (mark.type === 'italic') return `<em>${current}</em>`;
    if (mark.type === 'underline') return `<u>${current}</u>`;
    if (mark.type === 'textStyle') {
      const rawColor = mark.attrs?.color;
      if (rawColor && allowedTextColors.includes(rawColor)) {
        const color = rawColor === '#111827' ? styles.navy : rawColor;
        return `<span style="color:${color}">${current}</span>`;
      }
    }
    if (mark.type === 'link') return `<a href="${esc(mark.attrs.href)}">${current}</a>`;
    return current;
  }, text);
}

function renderNodes(items: TiptapNode[] = []): string {
  return items
    .map((node, index) => {
      if (node.type === 'text') return renderMarks(esc(node.text), node.marks);
      if (node.type === 'hardBreak') return '<br />';
      if (node.type === 'bulletList')
        return `<ul style="margin:0 0 12px 20px; padding:0">${renderNodes(node.content)}</ul>`;
      if (node.type === 'orderedList')
        return `<ol style="margin:0 0 12px 20px; padding:0">${renderNodes(node.content)}</ol>`;
      if (node.type === 'listItem') return `<li>${renderNodes(node.content)}</li>`;
      const tag = node.type === 'heading' ? `h${node.attrs.level}` : 'p';
      const previousNode = items[index - 1];
      const followsHeading = tag === 'p' && previousNode?.type === 'heading';
      const margin = tag === 'p' ? `margin:${followsHeading ? '8px' : '0'} 0 12px` : 'margin:0 0 8px';
      const typography =
        tag === 'p'
          ? 'font-size:14px;line-height:1.8'
          : 'font-family:Georgia, Times, serif;font-weight:400;line-height:1.25';
      return `<${tag} style="${margin};${typography}">${renderNodes(node.content)}</${tag}>`;
    })
    .join('');
}

export function renderText(block: TextBlock, options: { squareTop?: boolean } = {}) {
  const isBlue = block.background === 'blue';
  const radius = options.squareTop ? '0 0 4px 4px' : '4px';
  return `<mj-section background-color="${isBlue ? styles.navy : styles.cardBackground}" padding="0" border-radius="${radius}"><mj-column border-radius="${radius}"><mj-text font-size="14px" line-height="1.8" color="${isBlue ? '#ffffff' : styles.navy}" padding="24px 32px 20px">${renderNodes(block.content.content)}</mj-text></mj-column></mj-section>`;
}

import { allowedTextColors, type TiptapMark, type TiptapNode } from './schema';

function escapeHtml(value: string) {
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
        const color = rawColor === '#111827' ? '#17303d' : rawColor;
        return `<span style="color:${color}">${current}</span>`;
      }
    }
    if (mark.type === 'link') return `<a href="${escapeHtml(mark.attrs.href)}">${current}</a>`;
    return current;
  }, text);
}

export function renderTiptapHtml(nodes: TiptapNode[] = []): string {
  return nodes
    .map((node) => {
      if (node.type === 'text') return renderMarks(escapeHtml(node.text), node.marks);
      if (node.type === 'hardBreak') return '<br />';
      if (node.type === 'heading')
        return `<h${node.attrs.level}>${renderTiptapHtml(node.content)}</h${node.attrs.level}>`;
      if (node.type === 'bulletList') return `<ul>${renderTiptapHtml(node.content)}</ul>`;
      if (node.type === 'orderedList') return `<ol>${renderTiptapHtml(node.content)}</ol>`;
      if (node.type === 'listItem') return `<li>${renderTiptapHtml(node.content)}</li>`;
      return `<p>${renderTiptapHtml(node.content)}</p>`;
    })
    .join('');
}

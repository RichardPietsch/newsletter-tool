function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (match) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[match]!);
}

function renderMarks(text: string, marks: Array<{ type: string; attrs?: Record<string, string> }> = []) {
  return marks.reduce((current, mark) => {
    if (mark.type === 'bold') return `<strong>${current}</strong>`;
    if (mark.type === 'italic') return `<em>${current}</em>`;
    if (mark.type === 'underline') return `<u>${current}</u>`;
    if (mark.type === 'textStyle' && ['#dc2626', '#6d7478', '#111827'].includes(mark.attrs?.color)) return `<span style="color:${mark.attrs.color}">${current}</span>`;
    if (mark.type === 'link') return `<a href="${escapeHtml(mark.attrs?.href ?? '#')}">${current}</a>`;
    return current;
  }, text);
}

export function renderTiptapHtml(nodes: any[] = []): string {
  return nodes.map((node) => {
    if (node.type === 'text') return renderMarks(escapeHtml(node.text ?? ''), node.marks);
    if (node.type === 'hardBreak') return '<br />';
    if (node.type === 'heading') return `<h${node.attrs?.level === 3 ? 3 : 2}>${renderTiptapHtml(node.content)}</h${node.attrs?.level === 3 ? 3 : 2}>`;
    if (node.type === 'bulletList') return `<ul>${renderTiptapHtml(node.content)}</ul>`;
    if (node.type === 'orderedList') return `<ol>${renderTiptapHtml(node.content)}</ol>`;
    if (node.type === 'listItem') return `<li>${renderTiptapHtml(node.content)}</li>`;
    return `<p>${renderTiptapHtml(node.content)}</p>`;
  }).join('');
}

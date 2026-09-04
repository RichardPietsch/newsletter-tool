import { allowedTextColors, type TextBlock, type TiptapMark, type TiptapNode } from '@/lib/newsletter/schema';
import {
  newsletterEmailClasses as classes,
  newsletterModuleStyles as styles,
  type NewsletterColorPalette,
} from '@/lib/newsletter/module-styles';

function esc(value: string) {
  return value.replace(
    /[&<>"']/g,
    (match) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[match]!,
  );
}

function renderMarks(text: string, marks: TiptapMark[] = [], colors: NewsletterColorPalette = styles.colors) {
  return marks.reduce((current, mark) => {
    if (mark.type === 'bold') return `<strong>${current}</strong>`;
    if (mark.type === 'italic') return `<em>${current}</em>`;
    if (mark.type === 'underline') return `<u>${current}</u>`;
    if (mark.type === 'textStyle') {
      const rawColor = mark.attrs?.color;
      if (rawColor && allowedTextColors.includes(rawColor)) {
        const isAccent = rawColor === '#dc2626' || rawColor === styles.colors.accent;
        const isMuted = rawColor === styles.colors.muted;
        const color = isAccent
          ? colors.accent
          : isMuted
            ? colors.muted
            : rawColor === '#ffffff'
              ? colors.featureText
              : colors.text;
        const colorClass = isAccent
          ? classes.accent
          : isMuted
            ? classes.muted
            : rawColor === '#ffffff'
              ? classes.featureText
              : classes.text;
        return `<span class="${colorClass}" style="color:${color}">${current}</span>`;
      }
    }
    if (mark.type === 'link')
      return `<a class="${classes.brand}" style="color:${colors.brand}" href="${esc(mark.attrs.href)}">${current}</a>`;
    return current;
  }, text);
}

function renderNodes(items: TiptapNode[] = [], colors: NewsletterColorPalette = styles.colors): string {
  return items
    .map((node, index) => {
      if (node.type === 'text') return renderMarks(esc(node.text), node.marks, colors);
      if (node.type === 'hardBreak') return '<br />';
      if (node.type === 'bulletList')
        return `<ul style="margin:0 0 12px 20px; padding:0">${renderNodes(node.content, colors)}</ul>`;
      if (node.type === 'orderedList')
        return `<ol style="margin:0 0 12px 20px; padding:0">${renderNodes(node.content, colors)}</ol>`;
      if (node.type === 'listItem') return `<li>${renderNodes(node.content, colors)}</li>`;
      if (node.type === 'blockquote')
        return `<blockquote style="margin:16px 0;padding:0 0 0 18px;border-left:4px solid currentColor;font-style:italic;opacity:.82">${renderNodes(node.content, colors)}</blockquote>`;
      const tag = node.type === 'heading' ? `h${node.attrs.level}` : 'p';
      const previousNode = items[index - 1];
      const followsHeading = tag === 'p' && previousNode?.type === 'heading';
      const margin = tag === 'p' ? `margin:${followsHeading ? '8px' : '0'} 0 12px` : 'margin:0 0 8px';
      const typography =
        tag === 'p'
          ? 'font-size:14px;line-height:1.8'
          : 'font-family:Georgia, Times, serif;font-weight:400;line-height:1.25';
      return `<${tag} style="${margin};${typography}">${renderNodes(node.content, colors)}</${tag}>`;
    })
    .join('');
}

export function renderText(
  block: TextBlock,
  options: { squareTop?: boolean } = {},
  colors: NewsletterColorPalette = styles.colors,
) {
  const isBlue = block.background === 'blue';
  const radius = options.squareTop ? '0 0 4px 4px' : '4px';
  const radiusClass = options.squareTop ? classes.roundedBottom : classes.rounded;
  const backgroundClass = isBlue ? classes.featureBackground : classes.surface;
  const textClass = isBlue ? classes.featureText : classes.text;
  return `<mj-section css-class="${backgroundClass} ${radiusClass}" background-color="${isBlue ? colors.featureBackground : colors.surface}" padding="0" border-radius="${radius}"><mj-column border-radius="${radius}"><mj-text css-class="${textClass}" font-size="14px" line-height="1.8" color="${isBlue ? colors.featureText : colors.text}" padding="24px 32px 20px">${renderNodes(block.content.content, colors)}</mj-text></mj-column></mj-section>`;
}

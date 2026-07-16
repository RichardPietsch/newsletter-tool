import { newsletterDocumentSchema, type NewsletterDocument } from './schema';

export type NewsletterSaveIssue = {
  path: string;
  message: string;
  blockId?: string;
  blockLabel: string;
  fieldKey?: string;
};

function blockLabel(document: NewsletterDocument, blockIndex?: number, itemIndex?: number) {
  if (blockIndex === undefined) return 'Newsletter';
  const block = document.blocks[blockIndex];
  if (!block) return `Modul ${blockIndex + 1}`;
  const labels: Record<string, string> = {
    header: 'Header',
    footer: 'Footer',
    text: 'Textmodul',
    image: 'Bildmodul',
    event: 'Event',
    featuredEvent: 'Highlight-Teaser',
    quote: 'Zitat',
    sectionHeading: 'Abschnittsüberschrift',
    eventGrid: 'Teaser-Grid',
  };
  const base = labels[block.type] ?? 'Modul';
  return itemIndex === undefined ? `${base} ${blockIndex + 1}` : `${base} ${blockIndex + 1}, Event ${itemIndex + 1}`;
}

function fieldKeyFromPath(path: (string | number)[]) {
  if (path[0] === 'title') return 'document.title';
  const blocksIndex = path.indexOf('blocks');
  if (blocksIndex === -1) return path.join('.');
  const rest = path.slice(blocksIndex + 2);
  if (rest[0] === 'items') return `items.${rest[2] ?? ''}.${rest.slice(3).join('.')}`;
  return rest.join('.');
}

export function validateNewsletterForSave(document: NewsletterDocument): NewsletterSaveIssue[] {
  const result = newsletterDocumentSchema.safeParse(document);
  if (result.success) return [];

  return result.error.issues.map((issue) => {
    const blockIndex = issue.path[0] === 'blocks' && typeof issue.path[1] === 'number' ? issue.path[1] : undefined;
    const itemIndex = issue.path[2] === 'items' && typeof issue.path[3] === 'number' ? issue.path[3] : undefined;
    const block = blockIndex === undefined ? undefined : document.blocks[blockIndex];
    const path = issue.path.join('.');
    return {
      path,
      message: issue.message,
      blockId: block?.id,
      blockLabel: blockLabel(document, blockIndex, itemIndex),
      fieldKey: fieldKeyFromPath(issue.path),
    };
  });
}

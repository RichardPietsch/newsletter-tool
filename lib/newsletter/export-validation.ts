import type { NewsletterBlock, NewsletterDocument } from './schema';

type ExportValidationMode = 'development' | 'production';

export type ExportValidationIssueCode = 'LOCAL_IMAGE_URL' | 'PRIVATE_IMAGE_URL' | 'NON_HTTPS_IMAGE_URL' | 'INVALID_IMAGE_URL' | 'MISSING_IMAGE_ALT';

export type ExportValidationIssue = {
  code: ExportValidationIssueCode;
  blockId: string;
  blockType: NewsletterBlock['type'];
  path: string;
  message: string;
};

type ExportImageCandidate = {
  blockId: string;
  blockType: NewsletterBlock['type'];
  path: string;
  src?: string;
  alt?: string;
  decorative?: boolean;
};

const INTERNAL_HOSTS = new Set(['localhost', 'minio', 'db', 'web']);

function isIPv4(hostname: string) {
  const parts = hostname.split('.');
  if (parts.length !== 4) return false;
  return parts.every((part) => /^\d+$/.test(part) && Number(part) >= 0 && Number(part) <= 255);
}

function isPrivateIPv4(hostname: string) {
  if (!isIPv4(hostname)) return false;
  const [a, b] = hostname.split('.').map(Number);
  return a === 10 || a === 127 || a === 0 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 169 && b === 254);
}

function hostnameIssue(hostname: string): Pick<ExportValidationIssue, 'code' | 'message'> | null {
  const normalized = hostname.toLowerCase();
  if (INTERNAL_HOSTS.has(normalized) || normalized.endsWith('.local')) {
    return { code: 'LOCAL_IMAGE_URL', message: 'Bild-URL verwendet einen lokalen oder internen Hostnamen und ist in E-Mail-Clients nicht erreichbar.' };
  }
  if (isPrivateIPv4(normalized)) {
    return { code: 'PRIVATE_IMAGE_URL', message: 'Bild-URL verwendet eine lokale oder private IP-Adresse und ist in E-Mail-Clients nicht erreichbar.' };
  }
  return null;
}

function collectImages(document: NewsletterDocument): ExportImageCandidate[] {
  const images: ExportImageCandidate[] = [];
  document.blocks.forEach((block, blockIndex) => {
    const blockPath = `blocks[${blockIndex}]`;
    if (block.type === 'image') {
      images.push({ blockId: block.id, blockType: block.type, path: `${blockPath}.src`, src: block.src, alt: block.alt, decorative: block.decorative });
      return;
    }
    if (block.type === 'event' && block.image?.src) {
      const image = block.image;
      images.push({ blockId: block.id, blockType: block.type, path: `${blockPath}.image.src`, src: image?.src, alt: image?.alt, decorative: image?.decorative });
      return;
    }
    if (block.type === 'featuredEvent' && block.image?.src) {
      const image = block.image;
      images.push({ blockId: block.id, blockType: block.type, path: `${blockPath}.image.src`, src: image?.src, alt: image?.alt, decorative: image?.decorative });
      return;
    }
    if (block.type === 'eventGrid') {
      block.items.forEach((item, itemIndex) => {
        if (!item.image?.src) return;
        images.push({
          blockId: block.id,
          blockType: block.type,
          path: `${blockPath}.items[${itemIndex}].image.src`,
          src: item.image.src,
          alt: item.image.alt,
          decorative: item.image.decorative,
        });
      });
    }
  });
  return images;
}

function validateImageUrl(candidate: ExportImageCandidate, mode: ExportValidationMode): ExportValidationIssue[] {
  const issues: ExportValidationIssue[] = [];
  const src = candidate.src?.trim();
  if (!src) return issues;

  if (!candidate.decorative && !candidate.alt?.trim()) {
    issues.push({ code: 'MISSING_IMAGE_ALT', blockId: candidate.blockId, blockType: candidate.blockType, path: candidate.path.replace(/\.src$/, '.alt'), message: 'Nicht-dekorative Bilder benötigen einen Alternativtext.' });
  }

  let parsed: URL;
  try {
    parsed = new URL(src);
  } catch {
    issues.push({ code: 'INVALID_IMAGE_URL', blockId: candidate.blockId, blockType: candidate.blockType, path: candidate.path, message: 'Bild-URL ist ungültig.' });
    return issues;
  }

  if (mode === 'production' && parsed.protocol !== 'https:') {
    issues.push({ code: 'NON_HTTPS_IMAGE_URL', blockId: candidate.blockId, blockType: candidate.blockType, path: candidate.path, message: 'Bild-URLs müssen in der öffentlichen Testumgebung HTTPS verwenden.' });
  }

  if (mode === 'production') {
    const hostIssue = hostnameIssue(parsed.hostname);
    if (hostIssue) {
      issues.push({ ...hostIssue, blockId: candidate.blockId, blockType: candidate.blockType, path: candidate.path });
    }
  }

  return issues;
}

export function validateNewsletterForExport(document: NewsletterDocument, options: { mode?: ExportValidationMode } = {}) {
  const mode = options.mode ?? (process.env.NODE_ENV === 'production' ? 'production' : 'development');
  return collectImages(document).flatMap((candidate) => validateImageUrl(candidate, mode));
}

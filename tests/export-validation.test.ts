import { describe, expect, it } from 'vitest';
import { createBlock, createDefaultDocument } from '@/lib/newsletter/defaults';
import { validateNewsletterForExport } from '@/lib/newsletter/export-validation';
import { insertBlock } from '@/lib/newsletter/operations';
import type {
  EventBlock,
  EventGridBlock,
  FeaturedEventBlock,
  ImageBlock,
  NewsletterBlock,
  NewsletterDocument,
} from '@/lib/newsletter/schema';

function documentWithBlock(block: NewsletterBlock): NewsletterDocument {
  return insertBlock(createDefaultDocument('Export Validation'), 1, block);
}

function imageDocument(src: string, alt = 'Testbild', decorative = false) {
  return documentWithBlock({ ...(createBlock('image') as ImageBlock), src, alt, decorative });
}

function issueCodes(document: NewsletterDocument, mode: 'production' | 'development' = 'production') {
  return validateNewsletterForExport(document, { mode }).map((issue) => issue.code);
}

describe('export validation', () => {
  it('blocks local and private production image URLs', () => {
    expect(issueCodes(imageDocument('http://localhost:9000/newsletter-assets/test.jpg'))).toContain('LOCAL_IMAGE_URL');
    expect(issueCodes(imageDocument('http://127.0.0.1:9000/test.jpg'))).toContain('PRIVATE_IMAGE_URL');
    expect(issueCodes(imageDocument('http://192.168.1.10/test.jpg'))).toContain('PRIVATE_IMAGE_URL');
    expect(issueCodes(imageDocument('http://minio:9000/test.jpg'))).toContain('LOCAL_IMAGE_URL');
  });

  it('requires https for production image URLs', () => {
    expect(issueCodes(imageDocument('http://example.com/test.jpg'))).toContain('NON_HTTPS_IMAGE_URL');
    expect(
      validateNewsletterForExport(imageDocument('https://assets.example.com/newsletter-assets/test.jpg'), {
        mode: 'production',
      }),
    ).toEqual([]);
  });

  it('keeps local MinIO URLs usable in development', () => {
    expect(
      validateNewsletterForExport(imageDocument('http://localhost:9000/newsletter-assets/test.jpg'), {
        mode: 'development',
      }),
    ).toEqual([]);
  });

  it('requires alt text for non-decorative images and accepts decorative empty-alt images', () => {
    expect(issueCodes(imageDocument('https://assets.example.com/test.jpg', ''))).toContain('MISSING_IMAGE_ALT');
    expect(
      validateNewsletterForExport(imageDocument('https://assets.example.com/test.jpg', '', true), {
        mode: 'production',
      }),
    ).toEqual([]);
  });

  it('checks event, featured event and event grid images', () => {
    const eventDocument = documentWithBlock({
      ...(createBlock('event') as EventBlock),
      image: { src: 'http://localhost:9000/event.jpg', alt: 'Event' },
    });
    const featuredDocument = documentWithBlock({
      ...(createBlock('featuredEvent') as FeaturedEventBlock),
      image: { src: 'http://minio:9000/featured.jpg', alt: 'Featured Event' },
    });
    const eventGrid = createBlock('eventGrid') as EventGridBlock;
    const gridDocument = documentWithBlock({
      ...eventGrid,
      items: [
        { ...eventGrid.items[0], image: { src: 'http://192.168.1.10/grid.jpg', alt: 'Grid Event' } },
        eventGrid.items[1],
      ],
    });

    expect(issueCodes(eventDocument)).toContain('LOCAL_IMAGE_URL');
    expect(issueCodes(featuredDocument)).toContain('LOCAL_IMAGE_URL');
    expect(issueCodes(gridDocument)).toContain('PRIVATE_IMAGE_URL');
  });
});

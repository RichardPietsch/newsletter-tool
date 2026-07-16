import type { EventBlock } from '@/lib/newsletter/schema';
export function renderEvent(b: EventBlock) {
  return `<mj-section background-color="#ffffff" padding="20px 24px" border-radius="4px"><mj-column border-radius="4px">${b.image?.src ? `<mj-image src="${b.image.src}" alt="${b.image.decorative ? '' : b.image.alt || ''}" padding="0 0 16px" />` : ''}<mj-text font-size="22px" font-weight="700" color="#17303d">${b.title}</mj-text>${b.date || b.location ? `<mj-text color="#5d6b82">${[b.date, b.location].filter(Boolean).join(' · ')}</mj-text>` : ''}${b.description ? `<mj-text line-height="1.6">${b.description}</mj-text>` : ''}${b.buttonUrl ? `<mj-button href="${b.buttonUrl}" background-color="#1d4ed8" color="#ffffff">${b.buttonLabel}</mj-button>` : ''}</mj-column></mj-section>`;
}

'use client';

import { TextRichEditor } from '@/components/inspector/text-rich-editor';
import type { TextBlock as T } from '@/lib/newsletter/schema';
import { newsletterModuleStyles as styles } from '@/lib/newsletter/module-styles';

export function TextBlock({
  block,
  readOnly = false,
  squareTop = false,
}: {
  block: T;
  readOnly?: boolean;
  squareTop?: boolean;
}) {
  const isBlue = block.background === 'blue';

  return (
    <div
      className={`overflow-hidden p-6 ${squareTop ? 'rounded-b-[4px]' : 'rounded-[4px]'}`}
      style={{ backgroundColor: isBlue ? styles.navy : styles.cardBackground, color: isBlue ? '#ffffff' : styles.navy }}
    >
      <TextRichEditor block={block} readOnly={readOnly} isBlue={isBlue} />
    </div>
  );
}

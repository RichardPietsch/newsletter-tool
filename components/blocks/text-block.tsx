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
  const colors = styles.colorVariables;

  return (
    <div
      className={`overflow-hidden p-6 ${squareTop ? 'rounded-b-[4px]' : 'rounded-[4px]'}`}
      style={{
        backgroundColor: isBlue ? colors.featureBackground : colors.surface,
        color: isBlue ? colors.featureText : colors.text,
      }}
    >
      <TextRichEditor block={block} readOnly={readOnly} isBlue={isBlue} />
    </div>
  );
}

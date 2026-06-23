'use client';

import type { TextBlock as T } from '@/lib/newsletter/schema';
import { renderTiptapHtml } from '@/lib/newsletter/tiptap-render';

export function TextBlock({ block }: { block: T }) {
  return <div className="prose prose-sm max-w-none bg-white p-6 text-slate-800" dangerouslySetInnerHTML={{ __html: renderTiptapHtml(block.content.content) }} />;
}

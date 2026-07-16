'use client';

import { t } from '@/lib/i18n';

import Color from '@tiptap/extension-color';
import Link from '@tiptap/extension-link';
import TextStyle from '@tiptap/extension-text-style';
import Underline from '@tiptap/extension-underline';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useEffect } from 'react';
import type { TextBlock as T } from '@/lib/newsletter/schema';
import { useNewsletterStore } from '@/lib/newsletter/store';
import { newsletterModuleStyles as styles } from '@/lib/newsletter/module-styles';
import { RichTextToolbar } from '@/components/editor/rich-text-toolbar';

export function TextBlock({ block, readOnly = false, squareTop = false }: { block: T; readOnly?: boolean; squareTop?: boolean }) {
  const selectedId = useNewsletterStore((state) => state.selectedId);
  const update = useNewsletterStore((state) => state.update);
  const isSelected = selectedId === block.id;
  const isBlue = block.background === 'blue';

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      TextStyle,
      Color.configure({ types: ['textStyle'] }),
      Underline,
      Link.configure({ openOnClick: false }),
    ],
    content: block.content,
    editable: !readOnly,
    editorProps: {
      attributes: {
        class: `min-h-32 focus:outline-none [&_p]:text-[14px] [&_p]:leading-[1.8] [&_h1]:mb-2 [&_h1]:font-serif [&_h1]:text-3xl [&_h1]:font-normal [&_h1+p]:mt-2 [&_h2]:mb-2 [&_h2]:font-serif [&_h2]:text-2xl [&_h2]:font-normal [&_h2+p]:mt-2 [&_h3]:mb-2 [&_h3]:font-serif [&_h3]:text-xl [&_h3]:font-normal [&_h3+p]:mt-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 ${isBlue ? 'text-white' : ''}`,
        'aria-label': t('editor.textEditAria'),
      },
    },
    onUpdate: ({ editor }) => { if (!readOnly) update(block.id, { content: editor.getJSON() as T['content'] } as any); },
  });

  useEffect(() => {
    editor?.setEditable(!readOnly);
  }, [editor, readOnly]);

  useEffect(() => {
    if (!editor || editor.isFocused) return;
    const current = JSON.stringify(editor.getJSON());
    const next = JSON.stringify(block.content);
    if (current !== next) editor.commands.setContent(block.content, false);
  }, [block.content, editor]);

  return (
    <div className={`overflow-hidden p-6 ${squareTop ? 'rounded-b-[4px]' : 'rounded-[4px]'}`} style={{ backgroundColor: isBlue ? styles.navy : styles.cardBackground, color: isBlue ? '#ffffff' : styles.navy }}>
      {isSelected && editor && !readOnly ? <RichTextToolbar editor={editor} automaticColor={isBlue ? '#ffffff' : styles.navy} /> : null}
      {editor ? <EditorContent editor={editor} /> : <div className="min-h-32 text-slate-500">{t('editor.textLoading')}</div>}
    </div>
  );
}

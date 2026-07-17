'use client';

import { RichTextToolbar } from '@/components/editor/rich-text-toolbar';
import { t } from '@/lib/i18n';
import { newsletterModuleStyles as styles } from '@/lib/newsletter/module-styles';
import type { TextBlock } from '@/lib/newsletter/schema';
import { useNewsletterStore } from '@/lib/newsletter/store';
import Color from '@tiptap/extension-color';
import Link from '@tiptap/extension-link';
import TextStyle from '@tiptap/extension-text-style';
import Underline from '@tiptap/extension-underline';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useEffect } from 'react';

type TextRichEditorProps = {
  block: TextBlock;
  readOnly: boolean;
  isBlue: boolean;
};

export function TextRichEditor({ block, readOnly, isBlue }: TextRichEditorProps) {
  const selectedId = useNewsletterStore((state) => state.selectedId);
  const update = useNewsletterStore((state) => state.update);
  const editor = useEditor({
    immediatelyRender: false,
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
    onUpdate: ({ editor: updatedEditor }) => {
      if (!readOnly) update(block.id, { content: updatedEditor.getJSON() as TextBlock['content'] });
    },
  });

  useEffect(() => {
    editor?.setEditable(!readOnly);
  }, [editor, readOnly]);

  useEffect(() => {
    if (!editor || editor.isFocused) return;
    if (JSON.stringify(editor.getJSON()) !== JSON.stringify(block.content)) {
      editor.commands.setContent(block.content, false);
    }
  }, [block.content, editor]);

  if (!editor) return <div className="min-h-32 text-slate-500">{t('editor.textLoading')}</div>;

  return (
    <>
      {selectedId === block.id && !readOnly ? (
        <RichTextToolbar editor={editor} automaticColor={isBlue ? '#ffffff' : styles.navy} />
      ) : null}
      <EditorContent editor={editor} />
    </>
  );
}

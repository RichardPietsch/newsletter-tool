'use client';

import Color from '@tiptap/extension-color';
import TextStyle from '@tiptap/extension-text-style';
import Underline from '@tiptap/extension-underline';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useEffect } from 'react';
import type { TextBlock as T } from '@/lib/newsletter/schema';
import { useNewsletterStore } from '@/lib/newsletter/store';
import { RichTextToolbar } from '@/components/editor/rich-text-toolbar';

export function TextBlock({ block }: { block: T }) {
  const selectedId = useNewsletterStore((state) => state.selectedId);
  const update = useNewsletterStore((state) => state.update);
  const isSelected = selectedId === block.id;

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      TextStyle,
      Color.configure({ types: ['textStyle'] }),
      Underline,
    ],
    content: block.content,
    editorProps: {
      attributes: {
        class: 'min-h-32 bg-white text-slate-800 focus:outline-none [&_h2]:text-2xl [&_h2]:font-bold [&_h3]:text-xl [&_h3]:font-bold [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6',
        'aria-label': 'Textmodul direkt bearbeiten',
      },
    },
    onUpdate: ({ editor }) => update(block.id, { content: editor.getJSON() as T['content'] } as any),
  });

  useEffect(() => {
    if (!editor || editor.isFocused) return;
    const current = JSON.stringify(editor.getJSON());
    const next = JSON.stringify(block.content);
    if (current !== next) editor.commands.setContent(block.content, false);
  }, [block.content, editor]);

  return (
    <div className="bg-white p-6">
      {isSelected && editor ? <RichTextToolbar editor={editor} /> : null}
      {editor ? <EditorContent editor={editor} /> : <div className="min-h-32 text-slate-500">Texteditor wird geladen …</div>}
    </div>
  );
}

'use client';

import Color from '@tiptap/extension-color';
import TextStyle from '@tiptap/extension-text-style';
import Underline from '@tiptap/extension-underline';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useEffect } from 'react';
import type { TextBlock } from '@/lib/newsletter/schema';

const buttonClass = 'rounded border px-2 py-1 text-sm hover:border-blue-600 aria-pressed:bg-blue-50 aria-pressed:border-blue-600';

export function TextRichEditor({ block, onChange }: { block: TextBlock; onChange: (content: TextBlock['content']) => void }) {
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
        class: 'min-h-48 rounded border bg-white p-3 prose prose-sm max-w-none focus:outline-none',
        'aria-label': 'Rich-Text-Inhalt',
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getJSON() as TextBlock['content']),
  });

  useEffect(() => {
    if (!editor) return;
    const current = JSON.stringify(editor.getJSON());
    const next = JSON.stringify(block.content);
    if (current !== next) editor.commands.setContent(block.content, false);
  }, [block.content, editor]);

  if (!editor) return <div className="rounded border p-3 text-sm text-slate-600">Editor wird geladen …</div>;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2" role="toolbar" aria-label="Textformatierung">
        <button type="button" className={buttonClass} aria-pressed={editor.isActive('paragraph')} onClick={() => editor.chain().focus().setParagraph().run()}>Absatz</button>
        <button type="button" className={buttonClass} aria-pressed={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>H2</button>
        <button type="button" className={buttonClass} aria-pressed={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>H3</button>
        <button type="button" className={buttonClass} aria-pressed={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>Fett</button>
        <button type="button" className={buttonClass} aria-pressed={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}>Kursiv</button>
        <button type="button" className={buttonClass} aria-pressed={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()}>Unterstrichen</button>
        <button type="button" className={buttonClass} aria-pressed={editor.isActive('textStyle', { color: '#111827' })} onClick={() => editor.chain().focus().setColor('#111827').run()}>Schwarz</button>
        <button type="button" className={buttonClass} aria-pressed={editor.isActive('textStyle', { color: '#dc2626' })} onClick={() => editor.chain().focus().setColor('#dc2626').run()}>Rot</button>
        <button type="button" className={buttonClass} aria-pressed={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}>Liste</button>
        <button type="button" className={buttonClass} aria-pressed={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}>Nummeriert</button>
      </div>
      <EditorContent editor={editor} />
      <p className="text-xs text-slate-500">Rot ist nur zum Hervorheben einzelner Begriffe vorgesehen; Layout, Abstände und Schriftgrößen bleiben systemdefiniert.</p>
    </div>
  );
}

'use client';

import type { Editor } from '@tiptap/react';

const buttonClass = 'rounded border px-2 py-1 text-sm hover:border-blue-600 aria-pressed:bg-blue-50 aria-pressed:border-blue-600';

export function RichTextToolbar({ editor }: { editor: Editor }) {
  return (
    <div className="mb-3 flex flex-wrap gap-2 rounded border bg-slate-50 p-2" role="toolbar" aria-label="Textformatierung">
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
  );
}

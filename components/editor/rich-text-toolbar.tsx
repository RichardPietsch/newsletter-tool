'use client';

import { useState } from 'react';
import type { Editor } from '@tiptap/react';

type IconButtonProps = {
  label: string;
  pressed: boolean;
  onClick: () => void;
  children: React.ReactNode;
};

const buttonClass = 'inline-flex h-9 w-9 items-center justify-center rounded border bg-white text-slate-700 hover:border-blue-600 hover:text-blue-700 aria-pressed:border-blue-600 aria-pressed:bg-blue-50 aria-pressed:text-blue-700';
const textColors = [
  { label: 'Schwarz', value: '#111827', className: 'bg-slate-950' },
  { label: 'Grau', value: '#6d7478', className: 'bg-slate-500' },
  { label: 'Rot', value: '#dc2626', className: 'bg-red-600' },
];

function IconButton({ label, pressed, onClick, children }: IconButtonProps) {
  return (
    <button type="button" className={buttonClass} aria-label={label} title={label} aria-pressed={pressed} onClick={onClick}>
      {children}
    </button>
  );
}

function Svg({ children }: { children: React.ReactNode }) {
  return <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{children}</svg>;
}

function ColorMenu({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState(false);
  const activeColor = textColors.find((color) => editor.isActive('textStyle', { color: color.value })) ?? textColors[0];

  return (
    <div className="relative">
      <button type="button" className={buttonClass} aria-label="Textfarbe auswählen" title="Textfarbe auswählen" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        <span aria-hidden="true" className={`h-4 w-4 rounded-full border ${activeColor.className}`} />
      </button>
      {open ? (
        <div className="absolute left-0 top-11 z-[110] flex gap-1 rounded border bg-white p-2 shadow-lg" role="menu" aria-label="Textfarbe">
          {textColors.map((color) => (
            <button
              key={color.value}
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
              aria-label={`Textfarbe ${color.label}`}
              onClick={() => {
                editor.chain().focus().setColor(color.value).run();
                setOpen(false);
              }}
            >
              <span aria-hidden="true" className={`h-4 w-4 rounded-full border ${color.className}`} />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function RichTextToolbar({ editor }: { editor: Editor }) {
  return (
    <div className="mb-3 flex flex-wrap gap-1 rounded border bg-slate-50 p-2" role="toolbar" aria-label="Textformatierung">
      <IconButton label="Absatz" pressed={editor.isActive('paragraph')} onClick={() => editor.chain().focus().setParagraph().run()}><span aria-hidden="true" className="font-serif text-base">¶</span></IconButton>
      <IconButton label="Überschrift 2" pressed={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}><span aria-hidden="true" className="text-xs font-bold">H2</span></IconButton>
      <IconButton label="Überschrift 3" pressed={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}><span aria-hidden="true" className="text-xs font-bold">H3</span></IconButton>
      <span className="mx-1 h-9 border-l" aria-hidden="true" />
      <IconButton label="Fett" pressed={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}><span aria-hidden="true" className="font-bold">B</span></IconButton>
      <IconButton label="Kursiv" pressed={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}><span aria-hidden="true" className="font-serif italic">I</span></IconButton>
      <IconButton label="Unterstreichen" pressed={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()}><span aria-hidden="true" className="underline underline-offset-2">U</span></IconButton>
      <span className="mx-1 h-9 border-l" aria-hidden="true" />
      <ColorMenu editor={editor} />
      <span className="mx-1 h-9 border-l" aria-hidden="true" />
      <IconButton label="Unnummerierte Liste" pressed={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}><Svg><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><circle cx="4" cy="6" r="1" /><circle cx="4" cy="12" r="1" /><circle cx="4" cy="18" r="1" /></Svg></IconButton>
      <IconButton label="Nummerierte Liste" pressed={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}><Svg><line x1="10" y1="6" x2="21" y2="6" /><line x1="10" y1="12" x2="21" y2="12" /><line x1="10" y1="18" x2="21" y2="18" /><path d="M4 6h1v4" /><path d="M4 10h2" /><path d="M4 14h2l-2 4h2" /></Svg></IconButton>
    </div>
  );
}

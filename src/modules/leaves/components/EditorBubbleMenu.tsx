import React from 'react';
import { BubbleMenu } from '@tiptap/react/menus';
import type { Editor } from '@tiptap/react';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code,
  TextQuote,
  List,
  ListOrdered,
} from 'lucide-react';
import { HeadingSelector } from './HeadingSelector';

interface BubbleMenuItemProps {
  onClick: () => void;
  isActive?: boolean;
  title: string;
  children: React.ReactNode;
}

const BubbleMenuItem: React.FC<BubbleMenuItemProps> = ({
  onClick,
  isActive,
  title,
  children,
}) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    className={`p-1.5 rounded-md transition-all duration-150 cursor-pointer ${
      isActive
        ? 'bg-white/20 text-white'
        : 'text-white/70 hover:bg-white/10 hover:text-white'
    }`}
  >
    {children}
  </button>
);

const isMac = typeof navigator !== 'undefined' && navigator.platform.toLowerCase().includes('mac');
const mod = isMac ? '⌘' : 'Ctrl+';
const shift = isMac ? '⇧' : 'Shift+';

const kbd = (keys: string) => `${mod}${keys}`;
const kbdShift = (keys: string) => `${mod}${shift}${keys}`;

interface EditorBubbleMenuProps {
  editor: Editor | null;
}

export const EditorBubbleMenu: React.FC<EditorBubbleMenuProps> = ({ editor }) => {
  if (!editor) return null;

  return (
    <BubbleMenu
      editor={editor}
      options={{
        placement: 'top',
      }}
      className="flex items-center gap-0.5 bg-slate-800 dark:bg-dark-800 border border-slate-700 dark:border-dark-700 rounded-xl shadow-xl px-2 py-1.5"
    >
      <BubbleMenuItem
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={editor.isActive('bold')}
        title={`Negrito (${kbd('B')})`}
      >
        <Bold className="h-3.5 w-3.5" />
      </BubbleMenuItem>

      <BubbleMenuItem
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={editor.isActive('italic')}
        title={`Itálico (${kbd('I')})`}
      >
        <Italic className="h-3.5 w-3.5" />
      </BubbleMenuItem>

      <BubbleMenuItem
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        isActive={editor.isActive('underline')}
        title={`Sublinhado (${kbdShift('U')})`}
      >
        <Underline className="h-3.5 w-3.5" />
      </BubbleMenuItem>

      <BubbleMenuItem
        onClick={() => editor.chain().focus().toggleStrike().run()}
        isActive={editor.isActive('strike')}
        title={`Tachado (${kbdShift('S')})`}
      >
        <Strikethrough className="h-3.5 w-3.5" />
      </BubbleMenuItem>

      <BubbleMenuItem
        onClick={() => editor.chain().focus().toggleCode().run()}
        isActive={editor.isActive('code')}
        title={`Código (${kbd('E')})`}
      >
        <Code className="h-3.5 w-3.5" />
      </BubbleMenuItem>

      <div className="w-px h-4 bg-slate-600 dark:bg-dark-600 mx-1" />

      <HeadingSelector editor={editor} variant="bubble" />

      <div className="w-px h-4 bg-slate-600 dark:bg-dark-600 mx-1" />

      <BubbleMenuItem
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        isActive={editor.isActive('blockquote')}
        title={`Citação (${kbdShift('B')})`}
      >
        <TextQuote className="h-3.5 w-3.5" />
      </BubbleMenuItem>

      <div className="w-px h-4 bg-slate-600 dark:bg-dark-600 mx-1" />

      <BubbleMenuItem
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        isActive={editor.isActive('bulletList')}
        title={`Lista com marcadores (${kbdShift('8')})`}
      >
        <List className="h-3.5 w-3.5" />
      </BubbleMenuItem>

      <BubbleMenuItem
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        isActive={editor.isActive('orderedList')}
        title={`Lista numerada (${kbdShift('9')})`}
      >
        <ListOrdered className="h-3.5 w-3.5" />
      </BubbleMenuItem>
    </BubbleMenu>
  );
};

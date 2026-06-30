import React from 'react';
import { BubbleMenu } from '@tiptap/react/menus';
import type { Editor } from '@tiptap/react';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  TextQuote,
  List,
  ListOrdered,
} from 'lucide-react';

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
        title="Negrito"
      >
        <Bold className="h-3.5 w-3.5" />
      </BubbleMenuItem>

      <BubbleMenuItem
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={editor.isActive('italic')}
        title="Itálico"
      >
        <Italic className="h-3.5 w-3.5" />
      </BubbleMenuItem>

      <BubbleMenuItem
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        isActive={editor.isActive('underline')}
        title="Sublinhado"
      >
        <Underline className="h-3.5 w-3.5" />
      </BubbleMenuItem>

      <BubbleMenuItem
        onClick={() => editor.chain().focus().toggleStrike().run()}
        isActive={editor.isActive('strike')}
        title="Tachado"
      >
        <Strikethrough className="h-3.5 w-3.5" />
      </BubbleMenuItem>

      <BubbleMenuItem
        onClick={() => editor.chain().focus().toggleCode().run()}
        isActive={editor.isActive('code')}
        title="Código"
      >
        <Code className="h-3.5 w-3.5" />
      </BubbleMenuItem>

      <div className="w-px h-4 bg-slate-600 dark:bg-dark-600 mx-1" />

      <BubbleMenuItem
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        isActive={editor.isActive('heading', { level: 1 })}
        title="Título 1"
      >
        <Heading1 className="h-3.5 w-3.5" />
      </BubbleMenuItem>

      <BubbleMenuItem
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        isActive={editor.isActive('heading', { level: 2 })}
        title="Título 2"
      >
        <Heading2 className="h-3.5 w-3.5" />
      </BubbleMenuItem>

      <div className="w-px h-4 bg-slate-600 dark:bg-dark-600 mx-1" />

      <BubbleMenuItem
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        isActive={editor.isActive('blockquote')}
        title="Citação"
      >
        <TextQuote className="h-3.5 w-3.5" />
      </BubbleMenuItem>

      <div className="w-px h-4 bg-slate-600 dark:bg-dark-600 mx-1" />

      <BubbleMenuItem
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        isActive={editor.isActive('bulletList')}
        title="Lista com marcadores"
      >
        <List className="h-3.5 w-3.5" />
      </BubbleMenuItem>

      <BubbleMenuItem
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        isActive={editor.isActive('orderedList')}
        title="Lista numerada"
      >
        <ListOrdered className="h-3.5 w-3.5" />
      </BubbleMenuItem>
    </BubbleMenu>
  );
};

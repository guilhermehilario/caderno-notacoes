import React from 'react';
import type { Editor } from '@tiptap/react';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code,
  TextQuote,
  SeparatorHorizontal,
  List,
  ListOrdered,
  MessageSquarePlus,
} from 'lucide-react';
import { HeadingSelector } from './HeadingSelector';
import { LinkPopover } from './LinkPopover';
import { HighlightPopover } from './HighlightPopover';

interface ToolbarButtonProps {
  onClick: () => void;
  isActive?: boolean;
  title: string;
  children: React.ReactNode;
}

const ToolbarButton: React.FC<ToolbarButtonProps> = ({
  onClick,
  isActive,
  title,
  children,
}) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    className={`p-2 rounded-lg transition-all duration-150 cursor-pointer ${
      isActive
        ? 'bg-brand-100 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400 shadow-sm'
        : 'text-slate-500 hover:bg-slate-100 dark:text-dark-400 dark:hover:bg-dark-800'
    }`}
  >
    {children}
  </button>
);

interface EditorToolbarProps {
  editor: Editor | null;
}

const isMac = typeof navigator !== 'undefined' && navigator.platform.toLowerCase().includes('mac');
const mod = isMac ? '⌘' : 'Ctrl+';
const shift = isMac ? '⇧' : 'Shift+';

const kbd = (keys: string) => `${mod}${keys}`;
const kbdShift = (keys: string) => `${mod}${shift}${keys}`;

export const EditorToolbar: React.FC<EditorToolbarProps> = ({ editor }) => {
  if (!editor) return null;

  return (
    <div className="flex items-center gap-1 pb-3 mb-4 border-b border-slate-100 dark:border-dark-800/80 flex-shrink-0 overflow-x-auto">
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={editor.isActive('bold')}
        title={`Negrito (${kbd('B')})`}
      >
        <Bold className="h-4 w-4" />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={editor.isActive('italic')}
        title={`Itálico (${kbd('I')})`}
      >
        <Italic className="h-4 w-4" />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        isActive={editor.isActive('underline')}
        title={`Sublinhado (${kbdShift('U')})`}
      >
        <Underline className="h-4 w-4" />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleStrike().run()}
        isActive={editor.isActive('strike')}
        title={`Tachado (${kbdShift('S')})`}
      >
        <Strikethrough className="h-4 w-4" />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleCode().run()}
        isActive={editor.isActive('code')}
        title={`Código (${kbd('E')})`}
      >
        <Code className="h-4 w-4" />
      </ToolbarButton>

      <div className="w-px h-5 bg-slate-200 dark:bg-dark-700 mx-1" />

      <HeadingSelector editor={editor} variant="toolbar" />

      <div className="w-px h-5 bg-slate-200 dark:bg-dark-700 mx-1" />

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        isActive={editor.isActive('blockquote')}
        title={`Citação (${kbdShift('B')})`}
      >
        <TextQuote className="h-4 w-4" />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        title={`Linha horizontal (${kbdShift('-')})`}
      >
        <SeparatorHorizontal className="h-4 w-4" />
      </ToolbarButton>

      <div className="w-px h-5 bg-slate-200 dark:bg-dark-700 mx-1" />

      <LinkPopover editor={editor} />

      <HighlightPopover editor={editor} variant="toolbar" />

      <ToolbarButton
        onClick={() => {
          const selectedText = editor.state.doc.cut(
            editor.state.selection.from,
            editor.state.selection.to
          ).textContent;
          if (selectedText) {
            const annotation = window.prompt('Digite sua anotação:');
            if (annotation) {
              editor.chain().focus().setAnnotation({ text: annotation }).run();
            }
          }
        }}
        isActive={editor.isActive('annotation')}
        title="Marcar texto com anotação"
      >
        <MessageSquarePlus className="h-4 w-4" />
      </ToolbarButton>

      <div className="w-px h-5 bg-slate-200 dark:bg-dark-700 mx-1" />

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        isActive={editor.isActive('bulletList')}
        title={`Lista com marcadores (${kbdShift('8')})`}
      >
        <List className="h-4 w-4" />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        isActive={editor.isActive('orderedList')}
        title={`Lista numerada (${kbdShift('9')})`}
      >
        <ListOrdered className="h-4 w-4" />
      </ToolbarButton>
    </div>
  );
};

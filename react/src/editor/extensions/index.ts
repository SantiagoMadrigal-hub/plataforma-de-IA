import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { Markdown } from 'tiptap-markdown';

export const editorExtensions = [
  StarterKit.configure({
    heading: {
      levels: [1, 2, 3],
    },
  }),
  Link.configure({
    openOnClick: false,
    HTMLAttributes: {
      class: 'editor-link',
    },
  }),
  Image.configure({
    HTMLAttributes: {
      class: 'editor-image',
    },
  }),
  Placeholder.configure({
    placeholder: 'Escribe tu contenido aquí...',
  }),
  TaskList,
  TaskItem.configure({
    nested: true,
  }),
  Markdown.configure({
    html: true,
    transformPastedText: true,
    transformCopiedText: true,
  }),
];

export type { Editor } from '@tiptap/core';

import { useEditor } from '@tiptap/react';
import { useEffect } from 'react';
import { editorExtensions } from '../extensions';
import type { JSONContent } from '@tiptap/core';

interface UseDocumentEditorOptions {
  initialContent?: JSONContent | string;
  placeholder?: string;
}

export function useDocumentEditor(options: UseDocumentEditorOptions = {}) {
  const { initialContent } = options;

  const editor = useEditor({
    extensions: editorExtensions,
    content: initialContent || '',
    editorProps: {
      attributes: {
        class: 'tiptap-editor-content',
      },
    },
    autofocus: true,
  });

  useEffect(() => {
    if (editor) {
      editor.commands.focus();
    }
  }, [editor]);

  return editor;
}

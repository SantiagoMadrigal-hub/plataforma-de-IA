import type { Editor } from '@tiptap/core';

export function getSelectedText(editor: Editor): string {
  const { from, to } = editor.state.selection;
  return editor.state.doc.textBetween(from, to, '\n');
}

export function hasSelection(editor: Editor): boolean {
  const { from, to } = editor.state.selection;
  return from !== to;
}

export function replaceSelection(editor: Editor, text: string): void {
  const { from, to } = editor.state.selection;
  editor
    .chain()
    .focus()
    .deleteRange({ from, to })
    .insertContent(text)
    .run();
}

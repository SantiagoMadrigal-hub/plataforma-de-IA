import type { JSONContent } from '@tiptap/core';

export type EditorMode = 'create' | 'edit';

export interface DocumentEditorProps {
  mode: EditorMode;
  documentId?: string;
  initialFormat?: string;
  initialTone?: string;
  initialContent?: string;
  onSaved?: (doc: DocumentRecord) => void;
  onError?: (error: EditorError) => void;
}

export interface DocumentRecord {
  id: string;
  title: string;
  content: string;
  format?: string;
  tone?: string;
  status: 'draft' | 'published' | 'archived';
  created_at: string;
  updated_at: string;
}

export interface CreateDocumentPayload {
  title: string;
  content: string;
  format?: string;
  tone?: string;
  status?: DocumentRecord['status'];
}

export type UpdateDocumentPayload = Partial<CreateDocumentPayload>;

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export interface EditorError {
  code:
    | 'LOAD_FAILED'
    | 'SAVE_FAILED'
    | 'IMAGE_UPLOAD_FAILED'
    | 'AI_REWRITE_FAILED'
    | 'BRIDGE_NOT_READY';
  message: string;
  cause?: unknown;
}

export interface AiRewriteRequest {
  selectedText: string;
  instruction?: string;
  documentFormat?: string;
  documentTone?: string;
}

export interface AiRewriteResponse {
  rewrittenText: string;
}

export interface MarkdownSerializer {
  markdownToEditorContent: (markdown: string) => JSONContent;
  editorContentToMarkdown: (doc: JSONContent) => string;
}

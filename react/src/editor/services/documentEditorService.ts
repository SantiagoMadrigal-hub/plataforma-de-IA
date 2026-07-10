import type { DocumentRecord, CreateDocumentPayload, UpdateDocumentPayload } from '../types/editor.types';

interface DocumentService {
  getAll: () => Promise<DocumentRecord[]>;
  getById: (id: string) => Promise<DocumentRecord>;
  create: (payload: CreateDocumentPayload) => Promise<DocumentRecord>;
  update: (id: string, payload: UpdateDocumentPayload) => Promise<DocumentRecord>;
  delete: (id: string) => Promise<void>;
}

function getDocumentService(): DocumentService {
  if (typeof window === 'undefined' || !window.ContentFlowApp?.services?.documents) {
    throw new Error('ContentFlowApp.services.documents not available');
  }
  return window.ContentFlowApp.services.documents;
}

export const documentEditorService = {
  async getDocumentById(id: string): Promise<DocumentRecord> {
    const service = getDocumentService();
    const doc = await service.getById(id);
    return {
      id: doc.id,
      title: doc.title,
      content: doc.content,
      format: doc.format,
      tone: doc.tone,
      status: doc.status || 'draft',
      created_at: doc.created_at,
      updated_at: doc.updated_at,
    };
  },

  async createDocument(payload: CreateDocumentPayload): Promise<DocumentRecord> {
    const service = getDocumentService();
    const doc = await service.create({
      title: payload.title,
      content: payload.content,
      format: payload.format,
      tone: payload.tone,
      status: payload.status || 'draft',
    });
    return {
      id: doc.id,
      title: doc.title,
      content: doc.content,
      format: doc.format,
      tone: doc.tone,
      status: doc.status || 'draft',
      created_at: doc.created_at,
      updated_at: doc.updated_at,
    };
  },

  async updateDocument(id: string, payload: UpdateDocumentPayload): Promise<DocumentRecord> {
    const service = getDocumentService();
    const doc = await service.update(id, {
      title: payload.title,
      content: payload.content,
      format: payload.format,
      tone: payload.tone,
      status: payload.status,
    });
    return {
      id: doc.id,
      title: doc.title,
      content: doc.content,
      format: doc.format,
      tone: doc.tone,
      status: doc.status || 'draft',
      created_at: doc.created_at,
      updated_at: doc.updated_at,
    };
  },
};

import { api } from './http.js';

const CHAT_ENDPOINT = '/api/chat';

export class ChatService {
  async refine(content, instruction, context = {}) {
    const body = {
      content,
      instruction,
      ...(context.originalPrompt && { originalPrompt: context.originalPrompt }),
      ...(context.tone && { tone: context.tone }),
      ...(context.format && { format: context.format }),
    };
    const data = await api('POST', CHAT_ENDPOINT, body);
    return data.content;
  }
}

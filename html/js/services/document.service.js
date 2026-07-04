import { api } from './http.js';

function toCamelCase(obj) {
  if (Array.isArray(obj)) return obj.map(toCamelCase);
  if (obj && typeof obj === 'object') {
    const result = {};
    for (const key of Object.keys(obj)) {
      const camel = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
      result[camel] = toCamelCase(obj[key]);
    }
    return result;
  }
  return obj;
}

export class DocumentService {
  async getAll() {
    const data = await api('GET', '/api/documents');
    return toCamelCase(data.items || []);
  }

  async getById(id) {
    return toCamelCase(await api('GET', `/api/documents/${id}`));
  }

  async create({ title, type, content }) {
    return toCamelCase(await api('POST', '/api/documents', { title, format: type, content }));
  }

  async update(id, changes) {
    return toCamelCase(await api('PUT', `/api/documents/${id}`, changes));
  }

  async delete(id) {
    return api('DELETE', `/api/documents/${id}`);
  }
}

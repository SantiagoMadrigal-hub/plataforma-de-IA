// /js/services/document.service.js

export class DocumentService {
    constructor(documentRepository) {
        this.docRepo = documentRepository;
    }

    async getAll() {
        const docs = await this.docRepo.get() || [];
        return docs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    async getById(id) {
        const docs = await this.getAll();
        return docs.find(doc => doc.id === id);
    }

    async create({ title, type, content }) {
        const docs = await this.getAll();
        const newDoc = {
            id: crypto.randomUUID(),
            title: title,
            type: type,
            content: content,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        docs.push(newDoc);
        await this.docRepo.set(docs);
        return newDoc;
    }

    async update(id, changes) {
        const docs = await this.getAll();
        const index = docs.findIndex(doc => doc.id === id);

        if (index !== -1) {
            docs[index] = { ...docs[index], ...changes, updatedAt: new Date().toISOString() };
            await this.docRepo.set(docs);
            return docs[index];
        }
        return null;
    }

    async delete(id) {
        const docs = await this.getAll();
        const filtered = docs.filter(doc => doc.id !== id);
        await this.docRepo.set(filtered);
    }
}
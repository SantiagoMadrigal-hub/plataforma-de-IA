// /js/services/repository.js

export class Repository {
    constructor(storageAdapter, storageKey) {
        this.storage = storageAdapter;
        this.collectionKey = storageKey;
    }

    async init() {
        const raw = localStorage.getItem(this.collectionKey);
        if (raw === null) {
            const initialValue = this.collectionKey.includes('documents') ? [] : null;
            await this.storage.set(this.collectionKey, initialValue);
        }
    }

    async get() {
        return this.storage.get(this.collectionKey);
    }

    async set(data) {
        await this.storage.set(this.collectionKey, data);
    }
}
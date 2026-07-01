// Abstracción: una interfaz, dos implementaciones

export class LocalStorageAdapter {
    async get(key) {
        const data = localStorage.getItem(key);
        if (data === null || data === undefined) return null;
        try {
            return JSON.parse(data);
        } catch {
            return null;
        }
    }

    async set(key, val) {
        localStorage.setItem(key, JSON.stringify(val));
    }

    async delete(key) {
        localStorage.removeItem(key);
    }
}

export class SupabaseAdapter {
    constructor(supabaseUrl, supabaseAnonKey) {
        if (typeof supabase === 'undefined') {
            throw new Error(
                'Supabase client no disponible. ' +
                'Asegúrate de incluir el script CDN en tu HTML:\n' +
                '<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>'
            );
        }
        this.client = supabase.createClient(supabaseUrl, supabaseAnonKey);
    }

    async get(key) {
        const { data, error } = await this.client
            .from('app_data')
            .select('value')
            .eq('key', key)
            .single();
        if (error || !data) return null;
        return data.value;
    }

    async set(key, val) {
        const { error } = await this.client
            .from('app_data')
            .upsert({ key, value: val }, { onConflict: 'key' });
        if (error) throw error;
    }

    async delete(key) {
        const { error } = await this.client
            .from('app_data')
            .delete()
            .eq('key', key);
        if (error) throw error;
    }
}
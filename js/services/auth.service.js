// /js/services/auth.service.js

export class AuthService {
    constructor(authRepository) {
        this.authRepo = authRepository;
    }

    async #getUsers() {
        const data = await this.authRepo.storage.get('contentflow.users');
        return Array.isArray(data) ? data : [];
    }

    async #saveUsers(users) {
        await this.authRepo.storage.set('contentflow.users', users);
    }

    async #hashPassword(password) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hash = await crypto.subtle.digest('SHA-256', data);
        return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
    }

    // ─── Login con email/contraseña ───────────────────────────────────────────
    async login(email, password) {
        const users = await this.#getUsers();
        const user = users.find(u => u.email === email);

        if (!user) throw new Error('Credenciales inválidas');
        if (user.provider === 'google') throw new Error('Esta cuenta usa Google. Inicia sesión con Google.');

        const hashed = await this.#hashPassword(password);
        if (user.password !== hashed) throw new Error('Credenciales inválidas');

        const sessionData = {
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                avatar_url: user.avatar_url || null,
                provider: 'local'
            },
            token: 'session-' + crypto.randomUUID()
        };
        await this.authRepo.set(sessionData);
        return sessionData;
    }

    // ─── Registro con email/contraseña ────────────────────────────────────────
    async register(name, email, password) {
        const users = await this.#getUsers();
        if (users.find(u => u.email === email)) throw new Error('El correo ya está registrado');

        const formattedName = name.trim()
            .split(/\s+/)
            .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
            .join(' ');

        const hashed = await this.#hashPassword(password);
        const newUser = {
            id: crypto.randomUUID(),
            name: formattedName,
            email,
            password: hashed,
            avatar_url: null,
            provider: 'local',
            createdAt: new Date().toISOString()
        };
        users.push(newUser);
        await this.#saveUsers(users);

        const sessionData = {
            user: {
                id: newUser.id,
                name: newUser.name,
                email: newUser.email,
                avatar_url: null,
                provider: 'local'
            },
            token: 'session-' + crypto.randomUUID()
        };
        await this.authRepo.set(sessionData);
        return sessionData;
    }

    // ─── Login / Registro con Google ──────────────────────────────────────────
    async loginWithGoogle(googleUser) {
        // googleUser = { id, name, email, avatar_url } — viene del token de Google
        const users = await this.#getUsers();
        let user = users.find(u => u.email === googleUser.email);

        if (user && user.provider === 'local') {
            // Existía cuenta local con ese email: vincular con Google
            user.provider = 'google';
            user.google_id = googleUser.id;
            user.avatar_url = googleUser.avatar_url;
            await this.#saveUsers(users);
        } else if (!user) {
            // Primera vez: crear cuenta Google
            user = {
                id: crypto.randomUUID(),
                name: googleUser.name,
                email: googleUser.email,
                password: null,
                avatar_url: googleUser.avatar_url,
                provider: 'google',
                google_id: googleUser.id,
                createdAt: new Date().toISOString()
            };
            users.push(user);
            await this.#saveUsers(users);
        } else {
            // Ya existe cuenta Google: actualizar foto por si cambió
            user.avatar_url = googleUser.avatar_url;
            await this.#saveUsers(users);
        }

        const sessionData = {
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                avatar_url: user.avatar_url,
                provider: 'google'
            },
            token: 'session-' + crypto.randomUUID()
        };
        await this.authRepo.set(sessionData);
        return sessionData;
    }

    async logout() {
        await this.authRepo.set(null);
    }

    async isAuthenticated() {
        const session = await this.authRepo.get();
        return !!(session && session.token && session.user);
    }

    async getCurrentUser() {
        const session = await this.authRepo.get();
        return (session && session.token && session.user) ? session.user : null;
    }
}

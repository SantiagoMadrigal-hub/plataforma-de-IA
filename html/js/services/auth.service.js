import { api, attemptRefresh, setToken, setUser, getUser } from './http.js';

export class AuthService {
  async init() {
    const ok = await attemptRefresh();
    return ok;
  }

  async login(email, password) {
    const data = await api('POST', '/api/auth/login', { email, password });
    setToken(data.accessToken);
    setUser(data.user);
    return data;
  }

  async register(name, email, password) {
    const data = await api('POST', '/api/auth/register', { name, email, password });
    setToken(data.accessToken);
    setUser(data.user);
    return data;
  }

  async logout() {
    try {
      await api('POST', '/api/auth/logout');
    } catch {
    }
    setToken(null);
    setUser(null);
  }

  async getCurrentUser() {
    return getUser();
  }

  async getUserProfile() {
    const data = await api('GET', '/api/auth/me');
    if (data && data.id) {
      setUser(data);
    }
    return data;
  }

  async updateProfile(updates) {
    const data = await api('PUT', '/api/auth/me', updates);
    if (data && data.id) {
      setUser(data);
    }
    return data;
  }

  async loginWithGoogle(googleUser) {
    const data = await api('POST', '/api/auth/google', googleUser);
    setToken(data.accessToken);
    setUser(data.user);
    return data;
  }

  async isAuthenticated() {
    if (getUser()) return true;
    const ok = await attemptRefresh();
    return ok;
  }
}

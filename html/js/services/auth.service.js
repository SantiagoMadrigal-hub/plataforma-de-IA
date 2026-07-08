import { api, attemptRefresh, setToken, setUser, getUser } from './http.js';

export class AuthService {
  async init() {
    const ok = await attemptRefresh();
    return ok;
  }

  /**
   * @param {string} email
   * @param {string} password
   * @returns {Promise<Record<string, unknown>>}
   */
  async login(email, password) {
    const data = await api('POST', '/api/auth/login', { email, password });
    setToken(data.accessToken);
    setUser(data.user);
    return data;
  }

  /**
   * @param {string} name
   * @param {string} email
   * @param {string} password
   * @returns {Promise<Record<string, unknown>>}
   */
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

  /**
   * @returns {Record<string, unknown> | null}
   */
  async getCurrentUser() {
    return getUser();
  }

  /**
   * @returns {Promise<Record<string, unknown> | undefined>}
   */
  async getUserProfile() {
    const data = await api('GET', '/api/auth/me');
    if (data && data.id) {
      setUser(data);
    }
    return data;
  }

  /**
   * @param {Record<string, unknown>} updates
   * @returns {Promise<Record<string, unknown>>}
   */
  async updateProfile(updates) {
    const data = await api('PUT', '/api/auth/me', updates);
    if (data && data.id) {
      setUser(data);
    }
    return data;
  }

  /**
   * @param {{ id?: string; name?: string; email: string; avatar_url?: string }} googleUser
   * @returns {Promise<Record<string, unknown>>}
   */
  async loginWithGoogle(googleUser) {
    const data = await api('POST', '/api/auth/google', googleUser);
    setToken(data.accessToken);
    setUser(data.user);
    return data;
  }

  /**
   * @param {string} [password]
   * @returns {Promise<Record<string, unknown>>}
   */
  async deleteAccount(password) {
    const body = password ? { password } : {};
    const data = await api('DELETE', '/api/auth/account', body);
    setToken(null);
    setUser(null);
    return data;
  }

  /**
   * @param {string} plan
   * @returns {Promise<Record<string, unknown>>}
   */
  async checkout(plan) {
    return api('POST', '/api/stripe/checkout', { plan });
  }

  /**
   * @returns {Promise<boolean>}
   */
  async isAuthenticated() {
    if (getUser()) return true;
    const ok = await attemptRefresh();
    return ok;
  }
}

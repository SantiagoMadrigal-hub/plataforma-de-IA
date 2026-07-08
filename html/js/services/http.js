/** @type {string | null} */
let _accessToken = null;

/** @type {Record<string, unknown> | null} */
let _currentUser = null;

/**
 * @param {string | null} token
 */
export function setToken(token) {
  _accessToken = token;
}

/**
 * @returns {string | null}
 */
export function getToken() {
  return _accessToken;
}

/**
 * @param {Record<string, unknown> | null} user
 */
export function setUser(user) {
  _currentUser = user;
}

/**
 * @returns {Record<string, unknown> | null}
 */
export function getUser() {
  return _currentUser;
}

/**
 * @returns {string}
 */
function getBaseUrl() {
  const port = window.location.port;
  if (port === '3000' || port === '5173') {
    return `http://localhost:${port}`;
  }
  return '';
}

/**
 * @param {string} method - HTTP method
 * @param {string} path - API path
 * @param {Record<string, unknown> | undefined} [body] - Request body
 * @returns {Promise<Record<string, unknown>>}
 */
export async function api(method, path, body) {
  /** @type {RequestInit & { headers: Record<string, string> }} */
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  };
  if (_accessToken) {
    opts.headers['Authorization'] = `Bearer ${_accessToken}`;
  }
  if (body) {
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(`${getBaseUrl()}${path}`, opts);

  if (res.status === 401 && path !== '/api/auth/refresh') {
    const refreshed = await attemptRefresh();
    if (refreshed) {
      opts.headers['Authorization'] = `Bearer ${_accessToken}`;
      const retry = await fetch(`${getBaseUrl()}${path}`, opts);
      return retry.json();
    }
    _currentUser = null;
    _accessToken = null;
    throw new Error('Sesión expirada');
  }

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error?.message || 'Error en la solicitud');
  }
  return data;
}

/**
 * Intenta renovar el access token usando el refresh token (cookie httpOnly).
 * @returns {Promise<boolean>}
 */
export async function attemptRefresh() {
  try {
    const res = await fetch(`${getBaseUrl()}/api/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) return false;
    const data = await res.json();
    _accessToken = data.accessToken;
    _currentUser = data.user;
    return true;
  } catch {
    return false;
  }
}

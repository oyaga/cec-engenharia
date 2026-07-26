// Cliente central da API Go — substitui o acesso direto ao Supabase.
// Toda comunicação com o backend passa por aqui: base URL, JWT e erros.

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1';

const TOKEN_KEY = 'cec_token';

// ─── Token (segue o padrão "remember me": localStorage vs sessionStorage) ───
export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
}

export function setToken(token, remember) {
  clearToken();
  if (remember) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    sessionStorage.setItem(TOKEN_KEY, token);
  }
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
}

function notifyAuthExpired() {
  clearToken();
  window.dispatchEvent(new CustomEvent('cec:auth-expired'));
}

// ─── Requisição base ─────────────────────────────────────────────────
// Lança um Error com { status, message } em respostas não-2xx.
export async function request(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body != null ? JSON.stringify(body) : undefined,
    });
  } catch {
    const err = new Error('Não foi possível conectar ao servidor.');
    err.status = 0;
    throw err;
  }

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const err = new Error(data?.error || `Erro ${res.status}`);
    err.status = res.status;
    if (res.status === 401) notifyAuthExpired();
    throw err;
  }
  return data;
}

// ─── Upload de arquivo (multipart) ───────────────────────────────────
// Retorna { url, path }. Usa o token de sessão automaticamente.
export async function uploadFile(file, folder) {
  const form = new FormData();
  form.append('file', file);
  if (folder) form.append('folder', folder);

  const headers = {};
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}/upload`, { method: 'POST', headers, body: form });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const err = new Error(data?.error || `Erro ${res.status}`);
    err.status = res.status;
    if (res.status === 401) notifyAuthExpired();
    throw err;
  }
  return data;
}

// ─── Endpoints de autenticação ───────────────────────────────────────
export const authApi = {
  login: (email, password) =>
    request('/auth/login', { method: 'POST', auth: false, body: { email, password } }),
  me: () => request('/auth/me'),
  changePassword: (current_password, new_password) =>
    request('/auth/change-password', { method: 'POST', body: { current_password, new_password } }),
  setInitialPassword: (new_password) =>
    request('/auth/set-initial-password', { method: 'POST', body: { new_password } }),
  verifyManager: (email, password) =>
    request('/auth/verify-manager', { method: 'POST', body: { email, password } }),
  forgotPassword: (email) =>
    request('/auth/forgot-password', { method: 'POST', auth: false, body: { email } }),
  resetPassword: (token, new_password) =>
    request('/auth/reset-password', { method: 'POST', auth: false, body: { token, new_password } }),
};

export { API_BASE };

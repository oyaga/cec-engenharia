// Serviço de usuários — fala com o backend Go (substitui supabase.from('users')).
import { request } from '../lib/api';

export const usersApi = {
  list: (roles) => {
    const qs = roles && roles.length ? `?role=${roles.join(',')}` : '';
    return request(`/users${qs}`);
  },
  get: (id) => request(`/users/${id}`),
  create: (payload) => request('/users', { method: 'POST', body: payload }),
  update: (id, payload) => request(`/users/${id}`, { method: 'PUT', body: payload }),
  remove: (id) => request(`/users/${id}`, { method: 'DELETE' }),
  resetPassword: (id, password) => request(`/users/${id}/reset-password`, { method: 'POST', body: { password } }),
};

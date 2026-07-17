// Serviços transversais: pedidos, mensagens, comunicados gerais, CMS, turmas.
import { request } from '../lib/api';

export const ordersApi = {
  list: (params = {}) => {
    const p = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v) p.set(k, v); });
    const qs = p.toString();
    return request(`/orders${qs ? `?${qs}` : ''}`);
  },
  create: (payload) => request('/orders', { method: 'POST', body: payload }),
  update: (id, payload) => request(`/orders/${id}`, { method: 'PUT', body: payload }),
};

export const messagesApi = {
  list: (withUser) => request(`/messages${withUser ? `?with=${withUser}` : ''}`),
  create: (payload) => request('/messages', { method: 'POST', body: payload }),
  contacts: () => request('/messages/contacts'),
  markRead: (id) => request(`/messages/${id}/read`, { method: 'PUT' }),
};

export const generalAnnouncementsApi = {
  list: () => request('/general-announcements'),
  create: (payload) => request('/general-announcements', { method: 'POST', body: payload }),
  update: (id, payload) => request(`/general-announcements/${id}`, { method: 'PUT', body: payload }),
  remove: (id) => request(`/general-announcements/${id}`, { method: 'DELETE' }),
};

export const siteContentApi = {
  get: () => request('/public/site-content', { auth: false }),
  save: (content) => request('/site-content', { method: 'PUT', body: content }),
};

export const upcomingClassesApi = {
  list: (id) => request(`/upcoming-classes${id ? `?id=${id}` : ''}`),
  listPublic: () => request('/public/upcoming-classes', { auth: false }),
};

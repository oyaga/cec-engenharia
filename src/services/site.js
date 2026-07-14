// Serviço do site público (leads, ouvidoria, depoimentos, matrículas).
import { request } from '../lib/api';

export const leadsApi = {
  createPublic: (payload) => request('/public/leads', { method: 'POST', auth: false, body: payload }),
  list: ({ status, course_interest } = {}) => {
    const p = new URLSearchParams();
    if (status && status !== 'todos') p.set('status', status);
    if (course_interest && course_interest !== 'todos') p.set('course_interest', course_interest);
    const qs = p.toString();
    return request(`/leads${qs ? `?${qs}` : ''}`);
  },
  update: (id, payload) => request(`/leads/${id}`, { method: 'PUT', body: payload }),
  remove: (id) => request(`/leads/${id}`, { method: 'DELETE' }),
};

export const complaintsApi = {
  createPublic: (payload) => request('/public/complaints', { method: 'POST', auth: false, body: payload }),
  list: (status) => request(`/complaints${status && status !== 'todos' ? `?status=${status}` : ''}`),
  update: (id, status) => request(`/complaints/${id}`, { method: 'PUT', body: { status } }),
  remove: (id) => request(`/complaints/${id}`, { method: 'DELETE' }),
};

export const testimonialsApi = {
  listPublic: () => request('/public/testimonials', { auth: false }),
  submitPublic: (payload) => request('/public/testimonials', { method: 'POST', auth: false, body: payload }),
  list: (status) => request(`/testimonials${status && status !== 'todos' ? `?status=${status}` : ''}`),
  create: (payload) => request('/testimonials', { method: 'POST', body: payload }),
  update: (id, payload) => request(`/testimonials/${id}`, { method: 'PUT', body: payload }),
  remove: (id) => request(`/testimonials/${id}`, { method: 'DELETE' }),
};

export const enrollmentsApi = {
  createPublic: (payload) => request('/public/enrollments', { method: 'POST', auth: false, body: payload }),
  list: () => request('/enrollments'),
  update: (id, status) => request(`/enrollments/${id}`, { method: 'PUT', body: { status } }),
  remove: (id) => request(`/enrollments/${id}`, { method: 'DELETE' }),
};

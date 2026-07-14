// Serviço acadêmico (turmas/classes + instrutores). Fala com o backend Go.
import { request } from '../lib/api';

export const classesApi = {
  list: () => request('/classes'),
  create: (payload) => request('/classes', { method: 'POST', body: payload }),
  update: (id, payload) => request(`/classes/${id}`, { method: 'PUT', body: payload }),
  remove: (id) => request(`/classes/${id}`, { method: 'DELETE' }),
  // Instrutores da turma
  listInstructors: (classId) => request(`/classes/${classId}/instructors`),
  addInstructor: (classId, user_id, role = 'titular') =>
    request(`/classes/${classId}/instructors`, { method: 'POST', body: { user_id, role } }),
  removeInstructor: (classId, linkId) =>
    request(`/classes/${classId}/instructors/${linkId}`, { method: 'DELETE' }),
  availableInstructors: (method) =>
    request(`/available-instructors${method ? `?method=${encodeURIComponent(method)}` : ''}`),
  classStudents: (classId) => request(`/classes/${classId}/students`),
};

export const coursesApi = {
  listPublic: () => request('/public/courses', { auth: false }),
  list: (publishedOnly) => request(`/courses${publishedOnly ? '?published=true' : ''}`),
  get: (id) => request(`/courses/${id}`),
  create: (payload) => request('/courses', { method: 'POST', body: payload }),
  update: (id, payload) => request(`/courses/${id}`, { method: 'PUT', body: payload }),
  remove: (id) => request(`/courses/${id}`, { method: 'DELETE' }),
};

export const attendanceApi = {
  list: (params = {}) => {
    const p = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v) p.set(k, v); });
    const qs = p.toString();
    return request(`/attendance${qs ? `?${qs}` : ''}`);
  },
  create: (payload) => request('/attendance', { method: 'POST', body: payload }),
  update: (id, payload) => request(`/attendance/${id}`, { method: 'PUT', body: payload }),
};

export const studentsApi = {
  list: (params = {}) => {
    const p = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') p.set(k, v); });
    const qs = p.toString();
    return request(`/students${qs ? `?${qs}` : ''}`);
  },
  get: (id) => request(`/students/${id}`),
  create: (payload) => request('/students', { method: 'POST', body: payload }),
  update: (id, payload) => request(`/students/${id}`, { method: 'PUT', body: payload }),
  remove: (id) => request(`/students/${id}`, { method: 'DELETE' }),
};

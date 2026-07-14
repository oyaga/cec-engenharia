import { request } from '../lib/api'

// Equipe interna (colaboradores).
export const staffApi = {
  list: () => request('/staff'),
  create: (payload) => request('/staff', { method: 'POST', body: payload }),
  update: (id, payload) => request(`/staff/${id}`, { method: 'PUT', body: payload }),
  remove: (id) => request(`/staff/${id}`, { method: 'DELETE' }),
}

// Qualificações de instrutor (PR-127).
export const qualificationsApi = {
  list: (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return request(`/instructor-qualifications${qs ? `?${qs}` : ''}`)
  },
  create: (payload) => request('/instructor-qualifications', { method: 'POST', body: payload }),
  update: (id, payload) => request(`/instructor-qualifications/${id}`, { method: 'PUT', body: payload }),
  remove: (id) => request(`/instructor-qualifications/${id}`, { method: 'DELETE' }),
}

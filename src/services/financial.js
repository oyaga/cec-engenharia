// Serviços de financeiro, configurações, auditoria e avaliações.
import { request } from '../lib/api';

export const financialApi = {
  listRecords: (student_id) => request(`/financial/records${student_id ? `?student_id=${student_id}` : ''}`),
  createRecord: (payload) => request('/financial/records', { method: 'POST', body: payload }),
  updateRecord: (id, payload) => request(`/financial/records/${id}`, { method: 'PUT', body: payload }),
  removeRecord: (id) => request(`/financial/records/${id}`, { method: 'DELETE' }),

  listCosts: (class_id) => request(`/financial/costs${class_id ? `?class_id=${class_id}` : ''}`),
  createCost: (payload) => request('/financial/costs', { method: 'POST', body: payload }),
  updateCost: (id, payload) => request(`/financial/costs/${id}`, { method: 'PUT', body: payload }),
  removeCost: (id) => request(`/financial/costs/${id}`, { method: 'DELETE' }),

  listExpenses: () => request('/financial/expenses'),
  createExpense: (payload) => request('/financial/expenses', { method: 'POST', body: payload }),
  updateExpense: (id, payload) => request(`/financial/expenses/${id}`, { method: 'PUT', body: payload }),
  removeExpense: (id) => request(`/financial/expenses/${id}`, { method: 'DELETE' }),

  listInvoices: (student_id) => request(`/financial/invoices${student_id ? `?student_id=${student_id}` : ''}`),
  createInvoice: (payload) => request('/financial/invoices', { method: 'POST', body: payload }),

  setPin: (pin) => request('/financial/pin', { method: 'POST', body: { pin } }),
  verifyPin: (pin) => request('/financial/pin/verify', { method: 'POST', body: { pin } }),
};

export const settingsApi = {
  list: () => request('/settings'),
  save: (settings) => request('/settings', { method: 'PUT', body: { settings } }),
};

export const auditApi = {
  list: () => request('/audit'),
  record: (action, entity_type, entity_id, details) =>
    request('/audit', { method: 'POST', body: { action, entity_type, entity_id, details } }),
};

export const evaluationsApi = {
  list: (student_id) => request(`/evaluations${student_id ? `?student_id=${student_id}` : ''}`),
  create: (payload) => request('/evaluations', { method: 'POST', body: payload }),
  removeByStudent: (student_id) => request(`/evaluations?student_id=${student_id}`, { method: 'DELETE' }),
};

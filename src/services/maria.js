// Serviço de configuração do agente Maria Antônia.
import { request } from '../lib/api';

export const mariaApi = {
  getConfig: () => request('/maria/config'),
  saveConfig: (payload) => request('/maria/config', { method: 'PUT', body: payload }),
};

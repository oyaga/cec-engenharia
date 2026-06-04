const N8N_BASE = import.meta.env.VITE_N8N_BASE_URL || '';

export const n8n = {
  /**
   * Dispara um webhook no N8N.
   * Exemplo de path: '/webhook/nova-matricula'
   */
  triggerWebhook: async (path, payload) => {
    if (!N8N_BASE) {
      console.warn('N8N_BASE_URL não está configurada no .env');
      return null;
    }

    try {
      // Limpa barras duplicadas
      const endpoint = `${N8N_BASE}${path}`.replace(/([^:]\/)\/+/g, "$1");
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      return await response.json();
    } catch (error) {
      console.error(`Erro ao disparar N8N [${path}]:`, error);
      throw error;
    }
  }
};

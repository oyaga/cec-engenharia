import { supabase } from '../lib/supabase';

let cachedBase = null;
let cachedKey = null;

export function clearAsaasCache() {
  cachedBase = null;
  cachedKey = null;
  console.log('[Asaas Service] Cache de credenciais do Asaas limpo.');
}

// Buscar configurações do Asaas do banco
export const getAsaasSettings = async () => {
  if (cachedBase && cachedKey) {
    return {
      api_key: cachedKey,
      base_url: cachedBase,
      max_installments: 10,
      pix_discount: 15
    };
  }

  const { data, error } = await supabase
    .from('system_settings')
    .select('key, value')
    .in('key', [
      'asaas_api_key', 
      'asaas_environment',
      'asaas_max_installments_card',
      'asaas_pix_discount_percent'
    ]);
  
  if (error) {
    console.warn('[Asaas Service] Erro ao carregar credenciais do system_settings:', error);
  }

  const settings = {};
  data?.forEach(row => settings[row.key] = row.value);
  
  const apiKey = settings.asaas_api_key || '';
  let baseUrl = settings.asaas_environment === 'production'
    ? 'https://api.asaas.com/api/v3'
    : 'https://sandbox.asaas.com/api/v3';

  // Usar proxy no desenvolvimento local para evitar erros de CORS
  if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    baseUrl = settings.asaas_environment === 'production'
      ? '/asaas-production'
      : '/asaas-sandbox';
  }

  // Cachear para evitar múltiplas queries desnecessárias
  cachedKey = apiKey;
  cachedBase = baseUrl;

  return {
    api_key: apiKey,
    base_url: baseUrl,
    max_installments: parseInt(settings.asaas_max_installments_card) || 10,
    pix_discount: parseInt(settings.asaas_pix_discount_percent) || 15
  };
};

// Helper para chamadas à API
export const asaasRequest = async (endpoint, method = 'GET', body = null) => {
  const settings = await getAsaasSettings();
  
  if (!settings.api_key) {
    throw new Error('API Key do Asaas não configurada. Vá em Configurações Asaas.');
  }
  
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'access_token': settings.api_key
    }
  };
  
  if (body) options.body = JSON.stringify(body);
  
  const response = await fetch(`${settings.base_url}${endpoint}`, options);
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.errors?.[0]?.description || 'Erro na API do Asaas');
  }
  
  return response.json();
};

// ═══════════════════════════════════════
// CLIENTES
// ═══════════════════════════════════════

// Criar ou buscar cliente no Asaas
export const createOrFindCustomer = async (studentData) => {
  const cleanCpf = studentData.cpf.replace(/\D/g, '');
  
  // Primeiro tenta buscar pelo CPF
  try {
    const existing = await asaasRequest(`/customers?cpfCnpj=${cleanCpf}`);
    if (existing.data && existing.data.length > 0) {
      return existing.data[0];
    }
  } catch (e) {
    console.warn('[Asaas Service] Erro ao buscar cliente pelo CPF:', e);
  }
  
  // Criar novo cliente se não encontrou
  return await asaasRequest('/customers', 'POST', {
    name: studentData.name,
    cpfCnpj: cleanCpf,
    email: studentData.email,
    phone: studentData.phone,
    mobilePhone: studentData.phone,
    externalReference: studentData.id // ID do aluno no Supabase
  });
};

// ═══════════════════════════════════════
// COBRANÇAS
// ═══════════════════════════════════════

// Criar cobrança PIX
export const createPixPayment = async (customerId, value, description) => {
  return await asaasRequest('/payments', 'POST', {
    customer: customerId,
    billingType: 'PIX',
    value: parseFloat(value),
    dueDate: new Date().toISOString().split('T')[0],
    description: description,
    externalReference: `cec_pix_${Date.now()}`
  });
};

// Gerar QR Code PIX
export const getPixQrCode = async (paymentId) => {
  return await asaasRequest(`/payments/${paymentId}/pixQrCode`);
};

// Criar cobrança Boleto
export const createBoletoPayment = async (customerId, value, description, dueDate) => {
  return await asaasRequest('/payments', 'POST', {
    customer: customerId,
    billingType: 'BOLETO',
    value: parseFloat(value),
    dueDate: dueDate,
    description: description,
    externalReference: `cec_boleto_${Date.now()}`
  });
};

// Criar cobrança Cartão de Crédito
export const createCardPayment = async (customerId, value, description, installments, cardData) => {
  const installmentValue = (parseFloat(value) / parseInt(installments)).toFixed(2);
  
  return await asaasRequest('/payments', 'POST', {
    customer: customerId,
    billingType: 'CREDIT_CARD',
    value: parseFloat(value),
    dueDate: new Date().toISOString().split('T')[0],
    description: description,
    installmentCount: parseInt(installments),
    installmentValue: parseFloat(installmentValue),
    externalReference: `cec_card_${Date.now()}`,
    creditCard: {
      holderName: cardData.holderName,
      number: cardData.number.replace(/\s/g, ''),
      expiryMonth: cardData.expiryMonth,
      expiryYear: cardData.expiryYear,
      ccv: cardData.ccv
    },
    creditCardHolderInfo: {
      name: cardData.holderName,
      cpfCnpj: cardData.cpf.replace(/\D/g, ''),
      email: cardData.email,
      phone: cardData.phone,
      postalCode: cardData.postalCode.replace(/\D/g, ''),
      addressNumber: cardData.addressNumber
    }
  });
};

// Criar link de pagamento (para site público e Maria Antônia)
export const createPaymentLink = async (courseData) => {
  return await asaasRequest('/paymentLinks', 'POST', {
    name: courseData.title,
    description: `Matrícula no curso ${courseData.title} (${courseData.code})`,
    endDate: null, // sem expiração
    value: parseFloat(courseData.price_card || 0),
    billingType: 'UNDEFINED', // cliente escolhe PIX, Boleto ou Cartão
    chargeType: 'DETACHED',
    maxInstallmentCount: parseInt(courseData.max_installments) || 10,
    dueDateLimitDays: 10,
    subscriptionCycle: null,
    externalReference: `course_${courseData.id}`
  });
};

// Consultar status de pagamento
export const getPaymentStatus = async (paymentId) => {
  return await asaasRequest(`/payments/${paymentId}`);
};

// Listar cobranças de um cliente
export const listCustomerPayments = async (customerId) => {
  return await asaasRequest(`/payments?customer=${customerId}`);
};

// ═══════════════════════════════════════
// FINANCIAMENTO PRÓPRIO C&C
// ═══════════════════════════════════════

// Criar parcelamento no financiamento próprio (múltiplas cobranças)
export const createFinancingPayment = async (customerId, totalValue, installments, description) => {
  const installmentValue = (parseFloat(totalValue) / parseInt(installments)).toFixed(2);
  const payments = [];
  
  for (let i = 0; i < installments; i++) {
    const dueDate = new Date();
    dueDate.setMonth(dueDate.getMonth() + i + 1);
    
    const payment = await asaasRequest('/payments', 'POST', {
      customer: customerId,
      billingType: 'BOLETO',
      value: parseFloat(installmentValue),
      dueDate: dueDate.toISOString().split('T')[0],
      description: `${description} - Parcela ${i + 1}/${installments}`,
      externalReference: `cec_financing_${Date.now()}_${i + 1}`
    });
    
    payments.push(payment);
  }
  
  return payments;
};

// Objeto agrupado para retrocompatibilidade
export const asaas = {
  createCustomer: createOrFindCustomer,
  createPayment: async (data) => {
    // Adapter do placeholder para retrocompatibilidade
    return await asaasRequest('/payments', 'POST', data);
  },
  getPixQrCode,
  generateBoleto: async (paymentId) => {
    const settings = await getAsaasSettings();
    const domain = settings.base_url.replace(/\/api\/v3\/?$/, '');
    return { success: true, url: `${domain}/d/b/${paymentId}` };
  },
  getPaymentStatus,
  createOrFindCustomer,
  createPixPayment,
  createBoletoPayment,
  createCardPayment,
  createPaymentLink,
  listCustomerPayments,
  createFinancingPayment,
  clearAsaasCache
};

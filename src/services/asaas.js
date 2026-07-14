// Cliente Asaas — agora um PROXY para o backend Go.
// A chave do Asaas NUNCA vai ao browser (corrige C2): fica server-side e é
// usada apenas pelos endpoints /payments/* e /public/checkout do nosso backend.
import { request } from '../lib/api';

export function clearAsaasCache() {
  // Sem cache de credenciais no cliente (a chave não vive mais aqui).
}

// Configurações de exibição (parcelas/desconto). Best-effort via /settings.
export const getAsaasSettings = async () => {
  const defaults = { max_installments: 10, pix_discount: 15 };
  try {
    const { settings } = await request('/settings');
    const map = {};
    (settings || []).forEach(s => { map[s.key] = s.value; });
    return {
      max_installments: parseInt(map.asaas_max_installments_card) || defaults.max_installments,
      pix_discount: parseInt(map.asaas_pix_discount_percent) || defaults.pix_discount,
    };
  } catch {
    return defaults;
  }
};

// ─── Clientes ───
export const createOrFindCustomer = async (studentData) => {
  return request('/payments/customer', {
    method: 'POST',
    body: {
      name: studentData.name,
      cpf: (studentData.cpf || '').replace(/\D/g, ''),
      email: studentData.email,
      phone: studentData.phone,
      id: studentData.id,
    },
  });
};

// ─── Cobranças ───
const today = () => new Date().toISOString().split('T')[0];

export const createPixPayment = (customerId, value, description) =>
  request('/payments/create', {
    method: 'POST',
    body: { customer: customerId, billingType: 'PIX', value: parseFloat(value), dueDate: today(), description },
  });

export const getPixQrCode = (paymentId) => request(`/payments/${paymentId}/pix-qrcode`);

export const createBoletoPayment = (customerId, value, description, dueDate) =>
  request('/payments/create', {
    method: 'POST',
    body: { customer: customerId, billingType: 'BOLETO', value: parseFloat(value), dueDate: dueDate || today(), description },
  });

export const createCardPayment = (customerId, value, description, installments, cardData) => {
  const installmentValue = (parseFloat(value) / parseInt(installments)).toFixed(2);
  return request('/payments/create', {
    method: 'POST',
    body: {
      customer: customerId, billingType: 'CREDIT_CARD', value: parseFloat(value), dueDate: today(),
      description, installmentCount: parseInt(installments), installmentValue: parseFloat(installmentValue),
      creditCard: {
        holderName: cardData.holderName,
        number: (cardData.number || '').replace(/\s/g, ''),
        expiryMonth: cardData.expiryMonth,
        expiryYear: cardData.expiryYear,
        ccv: cardData.ccv,
      },
      creditCardHolderInfo: {
        name: cardData.holderName,
        cpfCnpj: (cardData.cpf || '').replace(/\D/g, ''),
        email: cardData.email,
        phone: cardData.phone,
        postalCode: (cardData.postalCode || '').replace(/\D/g, ''),
        addressNumber: cardData.addressNumber,
      },
    },
  });
};

export const createPaymentLink = (courseData) =>
  request('/payments/link', {
    method: 'POST',
    body: {
      name: courseData.title,
      description: `Matrícula no curso ${courseData.title} (${courseData.code || ''})`,
      value: parseFloat(courseData.price_card || 0),
      billingType: 'UNDEFINED',
      chargeType: 'DETACHED',
      maxInstallmentCount: parseInt(courseData.max_installments) || 10,
      dueDateLimitDays: 10,
      externalReference: `course_${courseData.id}`,
    },
  });

export const getPaymentStatus = async (paymentId) => {
  const res = await request(`/payments/${paymentId}/status`);
  return res.payment || res;
};

export const listCustomerPayments = (customerId) => request(`/payments?customer=${encodeURIComponent(customerId)}`);

// Testa uma chave Asaas server-side (não expõe a chave no browser).
export const testAsaasConnection = (apiKey, environment) =>
  request('/payments/test-connection', { method: 'POST', body: { api_key: apiKey, environment } });

// Busca cobranças por referência externa (ex.: id da inscrição).
export const searchPaymentsByRef = (ref) => request(`/payments?ref=${encodeURIComponent(ref)}`);

// Lista as últimas cobranças do Asaas (sincronização admin).
export const listAllPayments = () => request('/payments?all=true');

// Financiamento próprio C&C — múltiplos boletos mensais.
export const createFinancingPayment = async (customerId, totalValue, installments, description) => {
  const installmentValue = (parseFloat(totalValue) / parseInt(installments)).toFixed(2);
  const payments = [];
  for (let i = 0; i < installments; i++) {
    const dueDate = new Date();
    dueDate.setMonth(dueDate.getMonth() + i + 1);
    const payment = await request('/payments/create', {
      method: 'POST',
      body: {
        customer: customerId, billingType: 'BOLETO', value: parseFloat(installmentValue),
        dueDate: dueDate.toISOString().split('T')[0],
        description: `${description} - Parcela ${i + 1}/${installments}`,
      },
    });
    payments.push(payment);
  }
  return payments;
};

// Checkout público do site (uma chamada) — cria cobrança pelo backend.
export const publicCheckout = (payload) =>
  request('/public/checkout', { method: 'POST', auth: false, body: payload });

// Objeto agrupado para retrocompatibilidade.
export const asaas = {
  createCustomer: createOrFindCustomer,
  createPayment: (data) => request('/payments/create', { method: 'POST', body: data }),
  getPixQrCode,
  generateBoleto: async (paymentId) => {
    const p = await getPaymentStatus(paymentId);
    return { success: true, url: p?.bankSlipUrl || p?.invoiceUrl || '' };
  },
  getPaymentStatus,
  createOrFindCustomer,
  createPixPayment,
  createBoletoPayment,
  createCardPayment,
  createPaymentLink,
  listCustomerPayments,
  createFinancingPayment,
  publicCheckout,
  clearAsaasCache,
};

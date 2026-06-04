import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function validateCPF(cpf: string): boolean {
  const clean = cpf.replace(/\D/g, '')
  if (clean.length !== 11) return false
  if (/^(\d)\1+$/.test(clean)) return false
  
  let sum = 0
  let remainder
  for (let i = 1; i <= 9; i++) {
    sum += parseInt(clean.substring(i - 1, i)) * (11 - i)
  }
  remainder = (sum * 10) % 11
  if (remainder === 10 || remainder === 11) remainder = 0
  if (remainder !== parseInt(clean.substring(9, 10))) return false
  
  sum = 0
  for (let i = 1; i <= 10; i++) {
    sum += parseInt(clean.substring(i - 1, i)) * (12 - i)
  }
  remainder = (sum * 10) % 11
  if (remainder === 10 || remainder === 11) remainder = 0
  if (remainder !== parseInt(clean.substring(10, 11))) return false
  
  return true
}

function validateCNPJ(cnpj: string): boolean {
  const clean = cnpj.replace(/\D/g, '')
  if (clean.length !== 14) return false
  if (/^(\d)\1+$/.test(clean)) return false
  
  let size = clean.length - 2
  let numbers = clean.substring(0, size)
  const digits = clean.substring(size)
  let sum = 0
  let pos = size - 7
  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i)) * pos--
    if (pos < 2) pos = 9
  }
  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11)
  if (result !== parseInt(digits.charAt(0))) return false
  
  size = size + 1
  numbers = clean.substring(0, size)
  sum = 0
  pos = size - 7
  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i)) * pos--
    if (pos < 2) pos = 9
  }
  result = sum % 11 < 2 ? 0 : 11 - (sum % 11)
  if (result !== parseInt(digits.charAt(1))) return false
  
  return true
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { name, cpf, phone, email, cep, addressNumber, course, enrollmentId, turmaId, paymentMethod } = await req.json()
    
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const ASAAS_API_KEY = Deno.env.get('ASAAS_API_KEY')
    const ASAAS_URL = Deno.env.get('ASAAS_API_URL') || 'https://sandbox.asaas.com/api/v3'

    if (!ASAAS_API_KEY) throw new Error('Asaas API Key is missing')
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error('Supabase config is missing')

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // 1. Buscar o preço real da turma no banco (Segurança)
    let finalValue = 0
    if (turmaId) {
      const { data: turma, error: tError } = await supabase
        .from('classes')
        .select('*')
        .eq('id', turmaId)
        .single()
      
      if (!tError && turma) {
        if (paymentMethod === 'pix') finalValue = turma.price_cash
        else if (paymentMethod === 'credit_card') finalValue = turma.price_card_10x
        else if (paymentMethod === 'boleto') finalValue = turma.price_installments_3x
      }
    }

    if (!finalValue || finalValue <= 0) {
      // Fallback para valor padrão caso não encontre na turma (ajuste conforme necessário)
      finalValue = 3300.00 
    }

    // 2. Mapear Billing Type
    const billingTypeMap = {
      'pix': 'PIX',
      'credit_card': 'CREDIT_CARD',
      'boleto': 'BOLETO'
    }
    const billingType = billingTypeMap[paymentMethod] || 'UNDEFINED'

    // 3. Criar ou Buscar Cliente no Asaas
    const cleanCpf = cpf ? cpf.replace(/\D/g, '') : ''
    const isCpfValid = (cleanCpf.length === 11 && validateCPF(cleanCpf)) || (cleanCpf.length === 14 && validateCNPJ(cleanCpf))
    const cleanPhone = phone ? phone.replace(/\D/g, '') : ''
    const isPhoneValid = (cleanPhone.length === 10 || cleanPhone.length === 11) && !/^(\d)\1+$/.test(cleanPhone)

    if (!isCpfValid) {
      throw new Error('CPF ou CNPJ inválido. Por favor, insira um documento válido para prosseguir com o pagamento.')
    }

    let customerId = ''

    // Se tiver um CPF válido, tentamos buscar se o cliente já existe
    if (isCpfValid) {
      const customerReq = await fetch(`${ASAAS_URL}/customers?cpfCnpj=${cleanCpf}`, {
        headers: { 'access_token': ASAAS_API_KEY }
      })
      const customerRes = await customerReq.json()
      if (customerRes.data && customerRes.data.length > 0) {
        customerId = customerRes.data[0].id
      }
    }

    // Se não encontrou ou não tem CPF válido, criamos um novo cliente no Asaas
    if (!customerId) {
      const customerData = {
        name: name || 'Aluno CEC',
        email: email || ''
      }

      if (isCpfValid) {
        customerData.cpfCnpj = cleanCpf
      }
      if (isPhoneValid) {
        customerData.phone = cleanPhone
        customerData.mobilePhone = cleanPhone
      }
      if (cep) {
        customerData.postalCode = cep.replace(/\D/g, '')
      }
      if (addressNumber) {
        customerData.addressNumber = addressNumber
      }

      const newCustomerReq = await fetch(`${ASAAS_URL}/customers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'access_token': ASAAS_API_KEY },
        body: JSON.stringify(customerData)
      })
      const newCustomerRes = await newCustomerReq.json()
      if (newCustomerRes.errors) throw new Error(newCustomerRes.errors[0].description)
      customerId = newCustomerRes.id
    }

    // 4. Criar Cobrança
    const paymentReq = await fetch(`${ASAAS_URL}/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'access_token': ASAAS_API_KEY },
      body: JSON.stringify({
        customer: customerId,
        billingType: billingType,
        value: finalValue,
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 3 dias de validade
        description: `Matrícula - ${course} (CEC Engenharia)`,
        externalReference: enrollmentId,
        postalService: false
      })
    })
    
    const paymentRes = await paymentReq.json()
    if (paymentRes.errors) throw new Error(paymentRes.errors[0].description)

    return new Response(JSON.stringify({ invoiceUrl: paymentRes.invoiceUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})

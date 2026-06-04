-- 1. Adicionar coluna asaas_payment_link na tabela de cursos do LMS
ALTER TABLE public.lms_courses 
  ADD COLUMN IF NOT EXISTS asaas_payment_link TEXT;

-- 2. Garantir que a tabela system_settings existe
CREATE TABLE IF NOT EXISTS public.system_settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Popular dados padrão para o Asaas (caso não existam)
INSERT INTO public.system_settings (key, value) VALUES
  ('asaas_api_key', ''),
  ('asaas_environment', 'sandbox'),
  ('asaas_webhook_url', 'https://webhook.cursocec.com.br/webhook/asaas-payment'),
  ('asaas_max_installments_card', '10'),
  ('asaas_max_installments_financing', '6'),
  ('asaas_pix_discount_percent', '15')
ON CONFLICT (key) DO NOTHING;

-- 4. Tabela de logs do Webhook de Onboarding (pós-pagamento do Asaas)
CREATE TABLE IF NOT EXISTS public.onboarding_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES public.users(id),
  asaas_payment_id TEXT,
  asaas_customer_id TEXT,
  course_id UUID REFERENCES public.lms_courses(id),
  payment_value NUMERIC(10,2),
  payment_method TEXT,
  email_sent BOOLEAN DEFAULT FALSE,
  whatsapp_sent BOOLEAN DEFAULT FALSE,
  credentials_login TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Adicionar colunas necessárias na tabela public.students para o Asaas
ALTER TABLE public.students 
  ADD COLUMN IF NOT EXISTS asaas_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS asaas_payment_id TEXT;

-- 6. Adicionar colunas na tabela public.financial_records para controle de transações reais
ALTER TABLE public.financial_records 
  ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES public.lms_courses(id),
  ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'receita' CHECK (type IN ('receita', 'despesa')),
  ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'matricula',
  ADD COLUMN IF NOT EXISTS amount NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS asaas_payment_id TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pendente',
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS date TIMESTAMPTZ DEFAULT NOW();

-- 7. Habilitar Row Level Security (RLS) para onboarding_logs
ALTER TABLE public.onboarding_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Liberar acesso total às tabelas para todo usuário autenticado" ON public.onboarding_logs;
CREATE POLICY "Liberar acesso total às tabelas para todo usuário autenticado" ON public.onboarding_logs FOR ALL USING (auth.role() = 'authenticated');

-- 8. Configuração de Row Level Security (RLS) para system_settings
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir leitura pública de system_settings" ON public.system_settings;
CREATE POLICY "Permitir leitura pública de system_settings" ON public.system_settings FOR SELECT USING (true);
DROP POLICY IF EXISTS "Liberar acesso total às tabelas para todo usuário autenticado" ON public.system_settings;
CREATE POLICY "Liberar acesso total às tabelas para todo usuário autenticado" ON public.system_settings FOR ALL USING (auth.role() = 'authenticated');


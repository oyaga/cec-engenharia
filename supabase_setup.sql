-- ==========================================
-- SUPER APP ICC - SCRIPT DE CRIAÇÃO DO BANCO
-- ==========================================

-- 1. TABELA DE USUÁRIOS (Funcionários)
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'coordenador', 'atendente', 'instrutor')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. TABELA DE TURMAS (Classes)
CREATE TABLE public.classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  course_name TEXT NOT NULL,
  instructor_id UUID REFERENCES public.users(id),
  start_date DATE,
  predicted_end_date DATE,
  schedule TEXT,
  duration TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. TABELA DE ALUNOS (Students)
CREATE TABLE public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  matricula_numero SERIAL,
  turma_id UUID REFERENCES public.classes(id),
  full_name TEXT NOT NULL,
  cpf TEXT UNIQUE NOT NULL,
  rg TEXT,
  birth_date DATE,
  birth_place TEXT,
  marital_status TEXT,
  email TEXT,
  phone TEXT,
  education_level TEXT,
  parents_names JSONB,
  address JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. UPLOADS NO CADASTRO (Documentos)
CREATE TABLE public.student_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL CHECK (doc_type IN ('RG', 'CPF', 'Residencia', 'Escolaridade')),
  file_url TEXT NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. HISTÓRICO ACADÊMICO E NOTAS
CREATE TABLE public.academic_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'Ativo',
  theoretical_grade NUMERIC,
  practical_grade NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. PRESENÇA DIÁRIA E FICHÁRIO (Portal do Professor)
CREATE TABLE public.attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('presente', 'ausente', 'justificado')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.class_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
  instructor_id UUID REFERENCES public.users(id),
  date DATE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. FINANCEIRO E CUSTOS (Contas e Rateio)
CREATE TABLE public.financial_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  total_value NUMERIC NOT NULL,
  payment_method TEXT,
  installments JSONB, -- Ex: [{ dueDate: '2026-10-10', amount: 1500, status: 'pendente' }]
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.financial_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('fixed', 'percentage', 'profit_split_50_50')),
  value NUMERIC NOT NULL,
  amount NUMERIC NOT NULL,
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago')),
  date_incurred DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. CONTROLE DE NOTAS FISCAIS
CREATE TABLE public.invoices_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  financial_record_id UUID REFERENCES public.financial_records(id),
  nf_number TEXT,
  amount NUMERIC NOT NULL,
  issue_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. LOGS DE AUDITORIA (Inalteráveis)
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. HABILITANDO RLS (Segurança e Perfis Básicos)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS BÁSICAS (Acesso Total para Teste Inicial)
-- IMPORTANTE: Para ambiente de produção real, restringiremos por "role" no futuro.
CREATE POLICY "Liberar acesso total às tabelas para todo usuário autenticado" ON public.users FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Liberar acesso total às tabelas para todo usuário autenticado" ON public.classes FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Liberar acesso total às tabelas para todo usuário autenticado" ON public.students FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Liberar acesso total às tabelas para todo usuário autenticado" ON public.student_documents FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Liberar acesso total às tabelas para todo usuário autenticado" ON public.academic_records FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Liberar acesso total às tabelas para todo usuário autenticado" ON public.attendance_records FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Liberar acesso total às tabelas para todo usuário autenticado" ON public.class_logs FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Liberar acesso total às tabelas para todo usuário autenticado" ON public.financial_records FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Liberar acesso total às tabelas para todo usuário autenticado" ON public.financial_costs FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Liberar acesso total às tabelas para todo usuário autenticado" ON public.invoices_tracking FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Liberar acesso total às tabelas para todo usuário autenticado" ON public.audit_logs FOR ALL USING (auth.role() = 'authenticated');

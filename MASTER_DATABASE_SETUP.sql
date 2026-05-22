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


-- TABELA DE CURSOS (EAD)
CREATE TABLE IF NOT EXISTS public.lms_courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    thumbnail_url TEXT,
    is_published BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- TABELA DE MÓDULOS
CREATE TABLE IF NOT EXISTS public.lms_modules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID REFERENCES public.lms_courses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    order_index INT DEFAULT 0
);

-- TABELA DE AULAS (LIÇÕES)
CREATE TABLE IF NOT EXISTS public.lms_lessons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    module_id UUID REFERENCES public.lms_modules(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    video_url TEXT,
    content_text TEXT,
    min_watch_time_sec INT DEFAULT 0, -- Tempo mínimo para liberar próxima aula
    order_index INT DEFAULT 0
);

-- PROGRESSO DO ALUNO
CREATE TABLE IF NOT EXISTS public.lms_student_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    lesson_id UUID REFERENCES public.lms_lessons(id) ON DELETE CASCADE,
    watched_seconds INT DEFAULT 0,
    is_completed BOOLEAN DEFAULT false,
    last_accessed TIMESTAMPTZ DEFAULT now(),
    UNIQUE(student_id, lesson_id)
);

-- SISTEMA DE PROVAS (QUIZ)
CREATE TABLE IF NOT EXISTS public.lms_quizzes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID REFERENCES public.lms_courses(id) ON DELETE CASCADE,
    module_id UUID REFERENCES public.lms_modules(id) ON DELETE SET NULL, -- Prova pode ser por módulo ou curso
    title TEXT NOT NULL,
    passing_grade INT DEFAULT 70,
    max_attempts INT DEFAULT 3,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- QUESTÕES DAS PROVAS
CREATE TABLE IF NOT EXISTS public.lms_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quiz_id UUID REFERENCES public.lms_quizzes(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    options JSONB NOT NULL, -- Matriz de strings ["Opção A", "Opção B", ...]
    correct_option_index INT NOT NULL
);

-- RESULTADOS DAS PROVAS
CREATE TABLE IF NOT EXISTS public.lms_quiz_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    quiz_id UUID REFERENCES public.lms_quizzes(id) ON DELETE CASCADE,
    score INT NOT NULL,
    attempts_count INT DEFAULT 1,
    is_approved BOOLEAN DEFAULT false,
    completed_at TIMESTAMPTZ DEFAULT now()
);

-- FÓRUM / DÚVIDAS
CREATE TABLE IF NOT EXISTS public.lms_forum_topics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lesson_id UUID REFERENCES public.lms_lessons(id) ON DELETE CASCADE,
    student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.lms_forum_replies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    topic_id UUID REFERENCES public.lms_forum_topics(id) ON DELETE CASCADE,
    author_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- HABILITAR RLS (Segurança básica)
ALTER TABLE public.lms_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lms_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lms_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lms_student_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lms_quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lms_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lms_quiz_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lms_forum_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lms_forum_replies ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS DE ACESSO (Exemplos)
-- Todos podem ver cursos publicados
DROP POLICY IF EXISTS "Public courses are viewable by everyone" ON public.lms_courses;
CREATE POLICY "Public courses are viewable by everyone" ON public.lms_courses
FOR SELECT USING (is_published = true);

-- Apenas o administrador pode inserir aulas/módulos (necessário implementar papel 'admin' no Supabase)
-- (Já existe papel admin via tabela users, mas RLS precisa de polícias complexas ou triggers)


-- SUPORTE A IMAGENS EM PROVAS (LMS)
-- 1. Adicionar coluna de imagem na pergunta
ALTER TABLE public.lms_questions 
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Nota: Como 'options' é JSONB, podemos simplesmente começar a salvar objetos:
-- { "text": "...", "image_url": "..." } em vez de apenas strings. 
-- O código do frontend será adaptado para ler ambos.

-- 2. Garantir que o bucket para imagens de provas exista
-- (Rode isto se ainda não tiver um bucket 'lms-quiz-images')
INSERT INTO storage.buckets (id, name, public) 
VALUES ('lms-quiz-images', 'lms-quiz-images', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Políticas de Storage para o novo bucket
CREATE POLICY "Imagens de Provas Publicas"
ON storage.objects FOR SELECT
USING (bucket_id = 'lms-quiz-images');

CREATE POLICY "Admins podem subir imagens de provas"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'lms-quiz-images' AND
    (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND (users.role = 'admin' OR users.role = 'coordenador')))
);

-- Forçar reload do schema
NOTIFY pgrst, 'reload schema';


-- ADICIONA COLUNAS DE DOCUMENTOS NA TABELA DE ALUNOS
ALTER TABLE public.students
ADD COLUMN IF NOT EXISTS doc_photo_url TEXT,
ADD COLUMN IF NOT EXISTS doc_id_url TEXT,
ADD COLUMN IF NOT EXISTS doc_cpf_url TEXT,
ADD COLUMN IF NOT EXISTS doc_education_url TEXT,
ADD COLUMN IF NOT EXISTS doc_address_url TEXT,
ADD COLUMN IF NOT EXISTS doc_exams_url JSONB DEFAULT '[]';

-- ADICIONA COLUNA DE AVALIAÇÃO NA TABELA DE TURMAS
ALTER TABLE public.classes
ADD COLUMN IF NOT EXISTS evaluation_pdf_url TEXT;

-- CONFIGURAÇÃO DE BUCKETS (STORAGE)
-- Nota: O Supabase não permite criar buckets via SQL standard facilmente sem extensões,
-- mas podemos garantir que a lógica de permissões esteja pronta. 
-- Idealmente o usuário cria os buckets "student-docs" e "class-evaluations" no painel.

-- PERMISSÕES DE STORAGE (RLS)
-- Permitir que usuários autenticados façam upload e leitura (ajuste conforme necessidade de privacidade)
DO $$
BEGIN
    INSERT INTO storage.buckets (id, name, public) 
    VALUES ('student-docs', 'student-docs', true)
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO storage.buckets (id, name, public) 
    VALUES ('class-evaluations', 'class-evaluations', true)
    ON CONFLICT (id) DO NOTHING;
END $$;


-- 1. Corrigir erro de colunas ausentes na tabela de alunos
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS base_value NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_value NUMERIC DEFAULT 0;

-- 2. Adicionar coluna de valor do curso na tabela de turmas
ALTER TABLE public.classes 
ADD COLUMN IF NOT EXISTS course_value NUMERIC DEFAULT 0;

-- 3. Criar tabela de preços padrão por curso
CREATE TABLE IF NOT EXISTS public.course_prices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_name TEXT UNIQUE NOT NULL,
    default_value NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Ativar RLS
ALTER TABLE public.course_prices ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso
DROP POLICY IF EXISTS "Permitir leitura para todos autenticados" ON public.course_prices;
CREATE POLICY "Permitir leitura para todos autenticados" 
ON public.course_prices FOR SELECT 
TO authenticated 
USING (true);

DROP POLICY IF EXISTS "Permitir gestão para admins" ON public.course_prices;
CREATE POLICY "Permitir gestão para admins" 
ON public.course_prices FOR ALL 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE users.id = auth.uid() 
        AND (users.role = 'admin' OR users.role = 'coordenador')
    )
);

-- 4. Inserir valores padrão iniciais (Exemplos baseados nos cursos atuais)
INSERT INTO public.course_prices (course_name, default_value)
VALUES 
('Controle Dimensional – Caldeiraria e Tubulação – (CD-CL)', 1500.00),
('Controle Dimensional – Topografia (CD-TO)', 1200.00),
('Controle Dimensional - Mecânica- (CD-CM)', 1500.00)
ON CONFLICT (course_name) DO NOTHING;

-- COMENTÁRIO: Após rodar este script, o erro "base_value not found" desaparecerá.


-- SCRIPT PARA AUTOMAÇÃO DE ACESSO DOS ALUNOS
-- Este script prepara o banco para o fluxo de "Primeiro Acesso" e roles de estudante

-- 1. Adicionar coluna para controle de troca de senha no primeiro login
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT false;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 2. Atualizar a restrição de "role" para incluir o papel de 'student'
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'coordenador', 'atendente', 'instrutor', 'student'));

-- 3. (Opcional) Vincular Aluno ao Usuário do Auth
-- Caso queira que a tabela de students tenha referência direta ao ID do Auth
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 4. Garantir que o RLS permita que o aluno veja seu próprio perfil de usuário
DROP POLICY IF EXISTS "Usuários podem ver seu próprio perfil" ON public.users;
CREATE POLICY "Usuários podem ver seu próprio perfil" ON public.users
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Usuários podem atualizar sua própria senha_flag" ON public.users;
CREATE POLICY "Usuários podem atualizar sua própria senha_flag" ON public.users
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);


-- ============================================================
-- TABELA DE VÍNCULO: INSTRUTORES ↔ TURMAS
-- Suporta 1 titular + N substitutos por turma
-- ============================================================

CREATE TABLE IF NOT EXISTS public.class_instructors (
    id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    class_id    UUID NOT NULL,
    user_id     UUID NOT NULL,
    role        VARCHAR(20) NOT NULL DEFAULT 'titular'
                    CHECK (role IN ('titular', 'substituto')),
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(class_id, user_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_class_instructors_class ON public.class_instructors(class_id);
CREATE INDEX IF NOT EXISTS idx_class_instructors_user  ON public.class_instructors(user_id);

-- Row Level Security
ALTER TABLE public.class_instructors ENABLE ROW LEVEL SECURITY;

-- Política: todos autenticados podem gerenciar
CREATE POLICY "class_instructors_all" ON public.class_instructors
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);



-- Create the question bank table to store questions from all quizzes/exams
CREATE TABLE IF NOT EXISTS public.lms_question_bank (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_text TEXT,
    image_url TEXT,
    options JSONB NOT NULL,
    correct_option_index INTEGER NOT NULL,
    category TEXT, -- course_title or module_title
    difficulty TEXT DEFAULT 'medium',
    original_quiz_id UUID REFERENCES public.lms_quizzes(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster searching/filtering
CREATE INDEX IF NOT EXISTS idx_question_bank_category ON public.lms_question_bank(category);

-- Enable RLS
ALTER TABLE public.lms_question_bank ENABLE ROW LEVEL SECURITY;


-- DIFERENCIAÇÃO DE TIPOS DE AVALIAÇÃO
ALTER TABLE public.lms_quizzes 
ADD COLUMN IF NOT EXISTS quiz_type TEXT DEFAULT 'exercise'; -- 'exercise' ou 'final_exam'

-- Garantir que as provas existentes sejam tratadas como exercícios por padrão
UPDATE public.lms_quizzes SET quiz_type = 'exercise' WHERE quiz_type IS NULL;

-- Recarregar schema
NOTIFY pgrst, 'reload schema';


-- Script para criar o bucket "site_assets" e liberar o acesso público

-- 1. Inserir o bucket na tabela de buckets do storage, caso não exista
INSERT INTO storage.buckets (id, name, public)
VALUES ('site_assets', 'site_assets', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Permitir que qualquer pessoa leia as imagens (Acesso Público)
CREATE POLICY "Imagens públicas para visualização" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'site_assets');

-- 3. Permitir que usuários autenticados (ou webdesigners) façam upload
CREATE POLICY "Upload permitido para autenticados" 
ON storage.objects FOR INSERT 
WITH CHECK (
    bucket_id = 'site_assets' 
    AND auth.role() = 'authenticated'
);

-- 4. Permitir deleção/edição para usuários autenticados
CREATE POLICY "Deleção permitida para autenticados" 
ON storage.objects FOR DELETE 
USING (
    bucket_id = 'site_assets' 
    AND auth.role() = 'authenticated'
);

CREATE POLICY "Atualização permitida para autenticados" 
ON storage.objects FOR UPDATE 
USING (
    bucket_id = 'site_assets' 
    AND auth.role() = 'authenticated'
);


-- Script de Atualização (Fase 7 - Avaliações, Certificações e Financeiro Seguro)

-- 1. Tabela de Autorização Financeira (Senha do Gestor para Descontos em Frontends Desacoplados)
CREATE TABLE IF NOT EXISTS public.financial_pins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pin VARCHAR(20) NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'admin',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inserir PIN padrão Mestre "123456" para primeiro acesso e testes do diretor
INSERT INTO public.financial_pins (pin, role) VALUES ('123456', 'admin') ON CONFLICT DO NOTHING;

-- Liberar leitura RLS para conseguir bater o PIN
ALTER TABLE public.financial_pins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Leitura de Pins Pública" ON public.financial_pins FOR SELECT USING (true);

-- 2. Adiciona a coluna de verificação do Manual do Aluno e Valores Financeiros base
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS manual_signed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS base_value NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_value NUMERIC DEFAULT 0;

-- 3. Cria a tabela de Avaliações (Teórica e Prática com tentativas e retreinamento)
CREATE TABLE IF NOT EXISTS public.student_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
  exam_type TEXT NOT NULL CHECK (exam_type IN ('TEORICA', 'PRATICA')),
  attempt INTEGER NOT NULL CHECK (attempt >= 1 AND attempt <= 3),
  grade NUMERIC CHECK (grade >= 0 AND grade <= 10),
  retraining_hours INTEGER DEFAULT 0,
  date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS e Politicas
ALTER TABLE public.student_evaluations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso as avaliacoes" ON public.student_evaluations FOR ALL USING (true);

-- 4. Adiciona a coluna final de status na tabela academic_records 
ALTER TABLE public.academic_records 
ADD COLUMN IF NOT EXISTS final_status TEXT CHECK (final_status IN ('APROVADO', 'REPROVADO', 'PENDENTE')) DEFAULT 'PENDENTE';

-- 5. Criando Trigger para inserir na tabela users automaticamente (Gestão de Usuários)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role)
  VALUES (
    new.id, 
    new.email, 
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)), 
    COALESCE(new.raw_user_meta_data->>'role', 'atendente')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- ==========================================
-- SUPER APP ICC - ATUALIZAÇÃO FASE 9
-- Injeção do Campo de Melhorias Contínuas
-- ==========================================

-- 1. Adicionando a coluna de 'improvements' na tabela principal de alunos
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS improvements TEXT DEFAULT '';

-- Comentário da Modificação
COMMENT ON COLUMN students.improvements IS 'Acumulador de anotações descritivas do professor feitas durante o curso';


-- ==========================================
-- SUPER APP ICC - ATUALIZAÇÃO FASE 10
-- Injeção do Campo Data Real de Início da Turma
-- ==========================================

-- 1. Adicionando a coluna de 'actual_start_date' na tabela de turmas
ALTER TABLE classes 
ADD COLUMN IF NOT EXISTS actual_start_date DATE;

-- Comentário da Modificação
COMMENT ON COLUMN classes.actual_start_date IS 'Data real que a turma foi iniciada na prática, para controle analítico de prazo vs previsto';


-- ==========================================
-- SUPER APP ICC - ATUALIZAÇÃO FASE 12
-- Injeção do Módulo de Marketing / Captação
-- ==========================================

-- 1. Adicionando opções de origem (Pesquisa de Marketing) na tabela de alunos
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS how_knew VARCHAR(50) DEFAULT 'Amigo',
ADD COLUMN IF NOT EXISTS how_knew_other TEXT;

-- Comentário da Modificação
COMMENT ON COLUMN students.how_knew IS 'Pesquisa Mercado: Como o aluno conheceu o curso (ex: Amigo, Facebook, Instagram, Outro)';
COMMENT ON COLUMN students.how_knew_other IS 'Pesquisa Mercado: Especificação textual livre caso o meio primário seja Outro';


-- ==========================================
-- SUPER APP ICC - ATUALIZAÇÃO FASE 13
-- Permissões de Usuário e Configurações
-- ==========================================

-- 1. Adicionando permissões avançadas nos usuários
ALTER TABLE users ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{"upload_manual": false}'::jsonb;
COMMENT ON COLUMN users.permissions IS 'Permissões granulares de acesso a funcionalidades específicas';

-- 2. Tabela de configurações globais (Para URL do Manual)
CREATE TABLE IF NOT EXISTS system_settings (
    key VARCHAR(50) PRIMARY KEY,
    value TEXT,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Insere se não existir
INSERT INTO system_settings (key, value) VALUES ('manual_aluno_url', '') ON CONFLICT (key) DO NOTHING;

-- 3. Inserir permissão padrão p/ admin existente (Para evitar travamentos)
UPDATE users SET permissions = '{"upload_manual": true}'::jsonb WHERE role = 'admin' OR role = 'coordenador';


-- ==========================================
-- SUPER APP ICC - ATUALIZAÇÃO FASE 14
-- Proteção do Usuário Mestre (Desenvolvedor)
-- ==========================================

-- 1. Criação de uma Trigger Function para impedir a exclusão do usuário Mestre
CREATE OR REPLACE FUNCTION prevent_master_user_deletion()
RETURNS TRIGGER AS $$
BEGIN
    -- Impede a exclusão se o nome ou email apontar para o desenvolvedor
    IF OLD.full_name ILIKE '%desenvolvedor%' OR OLD.email ILIKE '%desenvolvedor%' THEN
        RAISE EXCEPTION 'Ação Negada: O usuário Mestre (Desenvolvedor) é protegido pelo sistema e não pode ser deletado.';
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- 2. Anexando a regra à tabela de usuários caso tentem deletar
DROP TRIGGER IF EXISTS protect_master_user ON users;
CREATE TRIGGER protect_master_user
BEFORE DELETE ON users
FOR EACH ROW
EXECUTE FUNCTION prevent_master_user_deletion();

-- Nota: Como as senhas do Supabase são criptografadas (Bcrypt), 
-- o Administrador poderá criar o usuário "desenvolvedor" (senha: Mariaclara1)
-- diretamente pela interface "Equipe > Novo Colaborador" do próprio sistema de forma 100% segura.
-- A partir do momento da criação, ele estará blindado de exclusão via Banco de Dados.


-- ==========================================
-- SUPER APP ICC - ATUALIZAÇÃO FASE 16
-- Motor de Encerramento e Datas Reais
-- ==========================================

-- 1. Adicionando coluna para registrar o Término REAL da Turma
ALTER TABLE classes ADD COLUMN IF NOT EXISTS actual_end_date DATE;
COMMENT ON COLUMN classes.actual_end_date IS 'Data real em que a turma foi encerrada / finalizada pelo coordenador';


-- ====================================================================
-- SCRIPT PARA ATUALIZAÇÃO DE PREÇOS E VIEW DE IA (FASE 17 - V2)
-- Execute este script no SQL Editor do seu painel Supabase.
-- ====================================================================

-- 1. Adicionar novas colunas de preço na tabela public.classes
ALTER TABLE public.classes 
ADD COLUMN IF NOT EXISTS price_cash NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS price_card_10x NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS price_installments_3x NUMERIC(10,2);

-- 2. Atualizar a View para o Agente de IA (n8n WhatsApp)
-- Nota: O PostgreSQL não permite mudar o nome ou número de colunas com "CREATE OR REPLACE VIEW" 
-- se a estrutura antiga for diferente. Por isso, usamos o DROP primeiro.

DROP VIEW IF EXISTS public.upcoming_classes;

CREATE VIEW public.upcoming_classes AS
SELECT 
    name as turma_nome,
    course_name as curso,
    start_date as data_inicio,
    schedule as horario,
    duration as carga_horaria,
    price_cash as valor_a_vista,
    price_card_10x as valor_cartao_10x,
    price_installments_3x as valor_boleto_3x,
    CASE 
        WHEN actual_start_date IS NOT NULL THEN 'Iniciada (Inscrições Abertas)'
        WHEN start_date < CURRENT_DATE THEN 'Atrasada/Adiada (Consultar nova data)'
        ELSE 'Prevista'
    END as status
FROM public.classes
WHERE 
    (actual_start_date IS NULL AND (start_date >= (CURRENT_DATE - INTERVAL '30 days') OR start_date IS NULL))
    OR 
    (actual_start_date >= (CURRENT_DATE - INTERVAL '7 days'));

-- 3. Garantir permissões
GRANT SELECT ON public.upcoming_classes TO anon;
GRANT SELECT ON public.upcoming_classes TO authenticated;

COMMENT ON VIEW public.upcoming_classes IS 'Lista de turmas disponíveis para venda com preços detalhados para o Agente de IA.';


-- ATUALIZAÇÕES FINANCEIRAS E RATEIO
-- 1. Colunas para regras de pagamento de instrutores na tabela 'classes'
ALTER TABLE public.classes 
ADD COLUMN IF NOT EXISTS instructor_payment_type TEXT DEFAULT 'fixed' CHECK (instructor_payment_type IN ('fixed', 'split')),
ADD COLUMN IF NOT EXISTS instructor_payment_value NUMERIC(10,2) DEFAULT 0;

-- 2. Coluna de categoria para despesas em 'financial_costs'
ALTER TABLE public.financial_costs 
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'Outros' 
CHECK (category IN ('Apostila', 'NF', 'Taxa ABENDI', 'Certificado', 'Aluguel Espaço', 'Estação Total', 'Custo Físico Aluno', 'Outros')),
ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL;

-- 3. Adicionar campo de 'Custo Físico Estimado' por aluno no curso para automação
ALTER TABLE public.lms_courses 
ADD COLUMN IF NOT EXISTS estimated_physical_cost_per_student NUMERIC(10,2) DEFAULT 0;

-- Recarregar schema (PostgREST)
NOTIFY pgrst, 'reload schema';


-- RATEIO PARA CURSOS ONLINE (EAD)
ALTER TABLE public.lms_courses 
ADD COLUMN IF NOT EXISTS instructor_payment_type TEXT DEFAULT 'fixed' CHECK (instructor_payment_type IN ('fixed', 'split')),
ADD COLUMN IF NOT EXISTS instructor_payment_value NUMERIC(10,2) DEFAULT 0;

-- Recarregar schema
NOTIFY pgrst, 'reload schema';


-- CONTROLE DE TEMPO LMS
-- 1. Carga horária mínima do curso (Teórico)
ALTER TABLE public.lms_courses 
ADD COLUMN IF NOT EXISTS min_theoretical_hours INT DEFAULT 0;

-- 2. Limite de tempo para realização da prova (em minutos)
ALTER TABLE public.lms_quizzes 
ADD COLUMN IF NOT EXISTS time_limit_minutes INT DEFAULT 0; -- 0 significa sem limite

-- Forçar reload do schema
NOTIFY pgrst, 'reload schema';


-- CONTROLE DE TEMPO LMS (CARGA HORÁRIA)
-- 1. Tabela para logs de tempo de estudo
CREATE TABLE IF NOT EXISTS public.lms_time_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    course_id UUID REFERENCES public.lms_courses(id) ON DELETE CASCADE,
    lesson_id UUID REFERENCES public.lms_lessons(id) ON DELETE SET NULL,
    quiz_id UUID REFERENCES public.lms_quizzes(id) ON DELETE SET NULL,
    duration_seconds INT NOT NULL DEFAULT 30,
    recorded_at TIMESTAMPTZ DEFAULT now()
);

-- Políticas RLS (Todos os usuários autenticados podem inserir seus próprios logs)
ALTER TABLE public.lms_time_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participantes podem enviar seus próprios logs" ON public.lms_time_logs
    FOR INSERT WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Gestores podem ver todos os logs" ON public.lms_time_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role IN ('admin', 'coordenador', 'atendente')
        )
    );

CREATE POLICY "Alunos podem ver seus próprios logs" ON public.lms_time_logs
    FOR SELECT USING (auth.uid() = student_id);

-- Recarregar schema (PostgREST)
NOTIFY pgrst, 'reload schema';


-- ============================================================
-- CORREÇÃO CRÍTICA: lms_quiz_results
-- Problema: Erro PGRST400 ao salvar resultado de quiz
-- Causa 1: Falta de constraint UNIQUE(student_id, quiz_id)
--          (necessária para o .upsert() funcionar no JS)
-- Causa 2: Falta de coluna updated_at (usada no AreaAluno.jsx)
-- Causa 3: Sem políticas RLS para alunos (SELECT/INSERT/UPDATE)
-- ============================================================

-- PASSO 1: Adicionar coluna updated_at (se não existir)
ALTER TABLE public.lms_quiz_results
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- PASSO 2: Criar trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_lms_quiz_results_updated_at ON public.lms_quiz_results;
CREATE TRIGGER trg_lms_quiz_results_updated_at
    BEFORE UPDATE ON public.lms_quiz_results
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- PASSO 3: Adicionar constraint UNIQUE para permitir o upsert
-- (necessário para o onConflict: ['student_id', 'quiz_id'] funcionar)
ALTER TABLE public.lms_quiz_results
DROP CONSTRAINT IF EXISTS lms_quiz_results_student_quiz_unique;

ALTER TABLE public.lms_quiz_results
ADD CONSTRAINT lms_quiz_results_student_quiz_unique 
UNIQUE (student_id, quiz_id);

-- PASSO 4: Políticas RLS para ALUNOS (leitura e escrita dos próprios resultados)
-- Política de SELECT: aluno vê apenas seus resultados
DROP POLICY IF EXISTS "Alunos podem ver seus resultados de quiz" ON public.lms_quiz_results;
CREATE POLICY "Alunos podem ver seus resultados de quiz"
ON public.lms_quiz_results FOR SELECT
TO authenticated
USING (student_id = auth.uid());

-- Política de INSERT: aluno pode inserir seus resultados
DROP POLICY IF EXISTS "Alunos podem inserir seus resultados de quiz" ON public.lms_quiz_results;
CREATE POLICY "Alunos podem inserir seus resultados de quiz"
ON public.lms_quiz_results FOR INSERT
TO authenticated
WITH CHECK (student_id = auth.uid());

-- Política de UPDATE: aluno pode atualizar seus próprios resultados
DROP POLICY IF EXISTS "Alunos podem atualizar seus resultados de quiz" ON public.lms_quiz_results;
CREATE POLICY "Alunos podem atualizar seus resultados de quiz"
ON public.lms_quiz_results FOR UPDATE
TO authenticated
USING (student_id = auth.uid())
WITH CHECK (student_id = auth.uid());

-- PASSO 5: Política para Administradores (ver TODOS os resultados)
DROP POLICY IF EXISTS "Admins podem ver todos os resultados de quiz" ON public.lms_quiz_results;
CREATE POLICY "Admins podem ver todos os resultados de quiz"
ON public.lms_quiz_results FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid()
        AND (users.role = 'admin' OR users.role = 'coordenador' OR users.role = 'instrutor')
    )
);

-- PASSO 6: Forçar reload do schema no PostgREST
NOTIFY pgrst, 'reload schema';


-- AJUSTES LMS: PDF E TIPOS DE PROVA
-- 1. Suporte a PDF nas aulas
ALTER TABLE public.lms_lessons 
ADD COLUMN IF NOT EXISTS pdf_url TEXT;

-- 2. Diferenciação de tipos de quiz
ALTER TABLE public.lms_quizzes 
ADD COLUMN IF NOT EXISTS quiz_type TEXT DEFAULT 'exercise'; -- 'exercise' | 'final_exam'

-- 3. Criar bucket para documentos se não existir (Opcional, mas recomendado)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('lms-docs', 'lms-docs', true) ON CONFLICT (id) DO NOTHING;

NOTIFY pgrst, 'reload schema';


-- AJUSTE DE PERMISSÕES LMS (RESOLVE ERRO DE NEW ROW VIOLATES RLS)
-- Este script libera a criação e edição de cursos para administradores e coordenadores.

-- 1. Política para CURSOS
DROP POLICY IF EXISTS "Administradores podem gerenciar cursos" ON public.lms_courses;
CREATE POLICY "Administradores podem gerenciar cursos" 
ON public.lms_courses FOR ALL 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE users.id = auth.uid() 
        AND (users.role = 'admin' OR users.role = 'coordenador')
    )
);

-- 2. Política para MÓDULOS
DROP POLICY IF EXISTS "Administradores podem gerenciar modulos" ON public.lms_modules;
CREATE POLICY "Administradores podem gerenciar modulos" 
ON public.lms_modules FOR ALL 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE users.id = auth.uid() 
        AND (users.role = 'admin' OR users.role = 'coordenador')
    )
);

-- 3. Política para AULAS
DROP POLICY IF EXISTS "Administradores podem gerenciar aulas" ON public.lms_lessons;
CREATE POLICY "Administradores podem gerenciar aulas" 
ON public.lms_lessons FOR ALL 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE users.id = auth.uid() 
        AND (users.role = 'admin' OR users.role = 'coordenador')
    )
);

-- 5. Política para QUIZZES
DROP POLICY IF EXISTS "Administradores podem gerenciar quizzes" ON public.lms_quizzes;
CREATE POLICY "Administradores podem gerenciar quizzes" 
ON public.lms_quizzes FOR ALL 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE users.id = auth.uid() 
        AND (users.role = 'admin' OR users.role = 'coordenador')
    )
);

-- 6. Política para QUESTÕES
DROP POLICY IF EXISTS "Administradores podem gerenciar questoes" ON public.lms_questions;
CREATE POLICY "Administradores podem gerenciar questoes" 
ON public.lms_questions FOR ALL 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE users.id = auth.uid() 
        AND (users.role = 'admin' OR users.role = 'coordenador')
    )
);

-- 4. Liberar leitura geral de cursos (mesmo não publicados) para ADM tbm ver no painel
DROP POLICY IF EXISTS "Admins podem ver todos os cursos" ON public.lms_courses;
CREATE POLICY "Admins podem ver todos os cursos" 
ON public.lms_courses FOR SELECT 
TO authenticated 
USING (true);

-- Forçar atualização do cache do Supabase
NOTIFY pgrst, 'reload schema';


-- ============================================================
-- FIX URGENTE: Adicionar colunas de pagamento em 'classes'
-- As turmas sumiram porque a query falha sem essas colunas
-- ============================================================

ALTER TABLE public.classes
    ADD COLUMN IF NOT EXISTS instructor_payment_type  VARCHAR(20)  NOT NULL DEFAULT 'fixed'
        CHECK (instructor_payment_type IN ('fixed', 'split')),
    ADD COLUMN IF NOT EXISTS instructor_payment_value NUMERIC(10,2) NOT NULL DEFAULT 0;

-- Refresca o schema cache do Supabase PostgREST
NOTIFY pgrst, 'reload schema';


-- ============================================================
-- FIX: Adicionar colunas de pagamento de instrutor em lms_courses
-- Erro: Could not find 'instructor_payment_type' column
-- ============================================================

ALTER TABLE public.lms_courses
    ADD COLUMN IF NOT EXISTS instructor_payment_type  VARCHAR(20)  NOT NULL DEFAULT 'fixed'
        CHECK (instructor_payment_type IN ('fixed', 'split')),
    ADD COLUMN IF NOT EXISTS instructor_payment_value NUMERIC(10,2) NOT NULL DEFAULT 0;

-- Refresca o schema cache do Supabase PostgREST
NOTIFY pgrst, 'reload schema';


-- CORREÇÃO DEFINITIVA DO SCHEMA DA TABELA STUDENTS
-- Este script adiciona as colunas que estavam faltando e que o código tenta usar.

ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS base_value NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_value NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS manual_signed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS has_lms_access BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_online_only BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS how_knew TEXT,
ADD COLUMN IF NOT EXISTS how_knew_other TEXT;

-- Forçar o Supabase a atualizar o cache do mapa de colunas
NOTIFY pgrst, 'reload schema';

-- Verificação final (rode isto para ter certeza que tudo apareceu)
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'students' 
AND column_name IN (
    'base_value', 
    'discount_value', 
    'manual_signed', 
    'has_lms_access', 
    'is_online_only'
);


-- Atualização de horários para turmas previstas (que ainda não iniciaram)
-- Modificando horários conforme solicitação: CD-CL/CD-CM (19h-21h) e CD-TO (20h-22h)

-- 1. Atualizar CD-CL (Caldeiraria) e CD-CM (Mecânica) para 19h às 21h
UPDATE public.classes
SET schedule = 'Seg a Sex 19h as 21h'
WHERE actual_start_date IS NULL 
  AND actual_end_date IS NULL
  AND (course_name LIKE '%(CD-CL)%' OR course_name LIKE '%(CD-CM)%');

-- 2. Atualizar CD-TO (Topografia) para 20h às 22h
UPDATE public.classes
SET schedule = 'Seg a Sex 20h as 22h'
WHERE actual_start_date IS NULL 
  AND actual_end_date IS NULL
  AND course_name LIKE '%(CD-TO)%';

-- Log de confirmação (opcional para verificação no console)
-- SELECT name, course_name, schedule FROM public.classes WHERE actual_start_date IS NULL;


-- Adicionar coluna 'is_immediate_start' para suportar turmas sem data fixa
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS is_immediate_start BOOLEAN DEFAULT false;


-- Adiciona a role 'aluno' aos usuários
ALTER TABLE public.users DROP CONSTRAINT users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'coordenador', 'atendente', 'instrutor', 'aluno'));

-- Cria relacionamento dos alunos com os usuários de auth
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS requires_password_change BOOLEAN DEFAULT true;

-- Criação do Bucket de Documentos dos Alunos (se não existir)
INSERT INTO storage.buckets (id, name, public) VALUES ('student_documents', 'student_documents', false) ON CONFLICT DO NOTHING;

-- RLS (Segurança) do Bucket: Aluno pode ver e inserir os próprios docs, Admins podem tudo
CREATE POLICY "Alunos podem ver seus proprios documentos" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'student_documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Alunos podem inserir seus proprios documentos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'student_documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Admins podem ver todos os documentos" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'student_documents' AND EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'coordenador', 'atendente')));


-- =========================================================================
-- SEED DE USUÁRIOS INICIAIS (WEBDESIGNER E SECRETARIA)
-- =========================================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  webdesigner_id UUID := gen_random_uuid();
  secretaria_id UUID := gen_random_uuid();
BEGIN
  -- 1. Criação do usuário Webdesigner no Auth
  INSERT INTO auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  VALUES (
    webdesigner_id, 'authenticated', 'authenticated', 'webdesigner@cec.com.br', crypt('123456', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()
  ) ON CONFLICT DO NOTHING;

  INSERT INTO auth.identities (id, provider_id, user_id, identity_data, provider, created_at, updated_at)
  VALUES (
    gen_random_uuid(), webdesigner_id::text, webdesigner_id, format('{"sub":"%s","email":"%s"}', webdesigner_id::text, 'webdesigner@cec.com.br')::jsonb, 'email', now(), now()
  ) ON CONFLICT DO NOTHING;

  -- Insere na tabela public.users
  INSERT INTO public.users (id, email, full_name, role)
  VALUES (webdesigner_id, 'webdesigner@cec.com.br', 'Master Webdesigner', 'admin')
  ON CONFLICT (id) DO UPDATE SET role = 'admin';


  -- 2. Criação do usuário Secretaria (Admin) no Auth
  INSERT INTO auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  VALUES (
    secretaria_id, 'authenticated', 'authenticated', 'secretaria@cursocec.com.br', crypt('123456', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()
  ) ON CONFLICT DO NOTHING;

  INSERT INTO auth.identities (id, provider_id, user_id, identity_data, provider, created_at, updated_at)
  VALUES (
    gen_random_uuid(), secretaria_id::text, secretaria_id, format('{"sub":"%s","email":"%s"}', secretaria_id::text, 'secretaria@cursocec.com.br')::jsonb, 'email', now(), now()
  ) ON CONFLICT DO NOTHING;

  -- Insere na tabela public.users
  INSERT INTO public.users (id, email, full_name, role)
  VALUES (secretaria_id, 'secretaria@cursocec.com.br', 'Secretaria CEC', 'admin')
  ON CONFLICT (id) DO UPDATE SET role = 'admin';

END $$;



CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.classes (
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

CREATE TABLE IF NOT EXISTS public.students (
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

CREATE TABLE IF NOT EXISTS public.student_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL CHECK (doc_type IN ('RG', 'CPF', 'Residencia', 'Escolaridade')),
  file_url TEXT NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.academic_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'Ativo',
  theoretical_grade NUMERIC,
  practical_grade NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('presente', 'ausente', 'justificado')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.class_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
  instructor_id UUID REFERENCES public.users(id),
  date DATE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.financial_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  total_value NUMERIC NOT NULL,
  payment_method TEXT,
  installments JSONB, -- Ex: [{ dueDate: '2026-10-10', amount: 1500, status: 'pendente' }]
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.financial_costs (
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

CREATE TABLE IF NOT EXISTS public.invoices_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  financial_record_id UUID REFERENCES public.financial_records(id),
  nf_number TEXT,
  amount NUMERIC NOT NULL,
  issue_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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

DROP POLICY IF EXISTS "Liberar acesso total às tabelas para todo usuário autenticado" ON public.users;
CREATE POLICY "Liberar acesso total às tabelas para todo usuário autenticado" ON public.users FOR ALL USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Liberar acesso total às tabelas para todo usuário autenticado" ON public.classes;
CREATE POLICY "Liberar acesso total às tabelas para todo usuário autenticado" ON public.classes FOR ALL USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Liberar acesso total às tabelas para todo usuário autenticado" ON public.students;
CREATE POLICY "Liberar acesso total às tabelas para todo usuário autenticado" ON public.students FOR ALL USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Liberar acesso total às tabelas para todo usuário autenticado" ON public.student_documents;
CREATE POLICY "Liberar acesso total às tabelas para todo usuário autenticado" ON public.student_documents FOR ALL USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Liberar acesso total às tabelas para todo usuário autenticado" ON public.academic_records;
CREATE POLICY "Liberar acesso total às tabelas para todo usuário autenticado" ON public.academic_records FOR ALL USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Liberar acesso total às tabelas para todo usuário autenticado" ON public.attendance_records;
CREATE POLICY "Liberar acesso total às tabelas para todo usuário autenticado" ON public.attendance_records FOR ALL USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Liberar acesso total às tabelas para todo usuário autenticado" ON public.class_logs;
CREATE POLICY "Liberar acesso total às tabelas para todo usuário autenticado" ON public.class_logs FOR ALL USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Liberar acesso total às tabelas para todo usuário autenticado" ON public.financial_records;
CREATE POLICY "Liberar acesso total às tabelas para todo usuário autenticado" ON public.financial_records FOR ALL USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Liberar acesso total às tabelas para todo usuário autenticado" ON public.financial_costs;
CREATE POLICY "Liberar acesso total às tabelas para todo usuário autenticado" ON public.financial_costs FOR ALL USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Liberar acesso total às tabelas para todo usuário autenticado" ON public.invoices_tracking;
CREATE POLICY "Liberar acesso total às tabelas para todo usuário autenticado" ON public.invoices_tracking FOR ALL USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Liberar acesso total às tabelas para todo usuário autenticado" ON public.audit_logs;
CREATE POLICY "Liberar acesso total às tabelas para todo usuário autenticado" ON public.audit_logs FOR ALL USING (auth.role() = 'authenticated');

CREATE TABLE IF NOT EXISTS public.lms_courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    thumbnail_url TEXT,
    is_published BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.lms_modules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID REFERENCES public.lms_courses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    order_index INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.lms_lessons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    module_id UUID REFERENCES public.lms_modules(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    video_url TEXT,
    content_text TEXT,
    min_watch_time_sec INT DEFAULT 0, -- Tempo mínimo para liberar próxima aula
    order_index INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.lms_student_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    lesson_id UUID REFERENCES public.lms_lessons(id) ON DELETE CASCADE,
    watched_seconds INT DEFAULT 0,
    is_completed BOOLEAN DEFAULT false,
    last_accessed TIMESTAMPTZ DEFAULT now(),
    UNIQUE(student_id, lesson_id)
);

CREATE TABLE IF NOT EXISTS public.lms_quizzes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID REFERENCES public.lms_courses(id) ON DELETE CASCADE,
    module_id UUID REFERENCES public.lms_modules(id) ON DELETE SET NULL, -- Prova pode ser por módulo ou curso
    title TEXT NOT NULL,
    passing_grade INT DEFAULT 70,
    max_attempts INT DEFAULT 3,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.lms_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quiz_id UUID REFERENCES public.lms_quizzes(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    options JSONB NOT NULL, -- Matriz de strings ["Opção A", "Opção B", ...]
    correct_option_index INT NOT NULL
);

CREATE TABLE IF NOT EXISTS public.lms_quiz_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    quiz_id UUID REFERENCES public.lms_quizzes(id) ON DELETE CASCADE,
    score INT NOT NULL,
    attempts_count INT DEFAULT 1,
    is_approved BOOLEAN DEFAULT false,
    completed_at TIMESTAMPTZ DEFAULT now()
);

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

ALTER TABLE public.lms_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lms_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lms_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lms_student_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lms_quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lms_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lms_quiz_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lms_forum_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lms_forum_replies ENABLE ROW LEVEL SECURITY;


DROP POLICY IF EXISTS "Public courses are viewable by everyone" ON public.lms_courses;
CREATE POLICY "Public courses are viewable by everyone" ON public.lms_courses
FOR SELECT USING (is_published = true);

ALTER TABLE public.lms_questions 
ADD COLUMN IF NOT EXISTS image_url TEXT;

CREATE TABLE IF NOT EXISTS public.lms_certificate_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_text TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.lms_certificate_configs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Certificados visiveis para todos" ON public.lms_certificate_configs;
CREATE POLICY "Certificados visiveis para todos" ON public.lms_certificate_configs FOR SELECT USING (true);
DROP POLICY IF EXISTS "Apenas admins alteram certificados" ON public.lms_certificate_configs;
CREATE POLICY "Apenas admins alteram certificados" ON public.lms_certificate_configs FOR ALL USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'coordenador')));

INSERT INTO public.lms_certificate_configs (template_text) 
SELECT 'Certificamos que {{nome_aluno}}, inscrito sob o CPF {{cpf_aluno}}, concluiu com êxito o curso de capacitação profissional em {{nome_curso}}, com carga horária de {{carga_horaria}} horas.'
WHERE NOT EXISTS (SELECT 1 FROM public.lms_certificate_configs);

INSERT INTO storage.buckets (id, name, public) 
VALUES ('lms-quiz-images', 'lms-quiz-images', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Imagens de Provas Publicas" ON storage.objects;
CREATE POLICY "Imagens de Provas Publicas"
ON storage.objects FOR SELECT
USING (bucket_id = 'lms-quiz-images');

DROP POLICY IF EXISTS "Admins podem subir imagens de provas" ON storage.objects;
CREATE POLICY "Admins podem subir imagens de provas"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'lms-quiz-images' AND
    (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND (users.role = 'admin' OR users.role = 'coordenador')))
);

NOTIFY pgrst, 'reload schema';

ALTER TABLE public.students
ADD COLUMN IF NOT EXISTS doc_photo_url TEXT,
ADD COLUMN IF NOT EXISTS doc_id_url TEXT,
ADD COLUMN IF NOT EXISTS doc_cpf_url TEXT,
ADD COLUMN IF NOT EXISTS doc_education_url TEXT,
ADD COLUMN IF NOT EXISTS doc_address_url TEXT,
ADD COLUMN IF NOT EXISTS doc_exams_url JSONB DEFAULT '[]';

ALTER TABLE public.classes
ADD COLUMN IF NOT EXISTS evaluation_pdf_url TEXT;

DO $$
BEGIN
    INSERT INTO storage.buckets (id, name, public) 
    VALUES ('student-docs', 'student-docs', true)
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO storage.buckets (id, name, public) 
    VALUES ('class-evaluations', 'class-evaluations', true)
    ON CONFLICT (id) DO NOTHING;
END $$;

ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS base_value NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_value NUMERIC DEFAULT 0;

ALTER TABLE public.classes 
ADD COLUMN IF NOT EXISTS course_value NUMERIC DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.course_prices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_name TEXT UNIQUE NOT NULL,
    default_value NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.course_prices ENABLE ROW LEVEL SECURITY;


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

INSERT INTO public.course_prices (course_name, default_value)
VALUES 
('Controle Dimensional – Caldeiraria e Tubulação – (CD-CL)', 1500.00),
('Controle Dimensional – Topografia (CD-TO)', 1200.00),
('Controle Dimensional - Mecânica- (CD-CM)', 1500.00)
ON CONFLICT (course_name) DO NOTHING;

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT false;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'coordenador', 'atendente', 'instrutor', 'student', 'aluno')) NOT VALID;

ALTER TABLE public.students ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;


DROP POLICY IF EXISTS "Usuários podem ver seu próprio perfil" ON public.users;
CREATE POLICY "Usuários podem ver seu próprio perfil" ON public.users
  FOR SELECT USING (auth.uid() = id);


DROP POLICY IF EXISTS "Usuários podem atualizar sua própria senha_flag" ON public.users;
CREATE POLICY "Usuários podem atualizar sua própria senha_flag" ON public.users
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE TABLE IF NOT EXISTS public.class_instructors (
    id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    class_id    UUID NOT NULL,
    user_id     UUID NOT NULL,
    role        VARCHAR(20) NOT NULL DEFAULT 'titular'
                    CHECK (role IN ('titular', 'substituto')),
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(class_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_class_instructors_class ON public.class_instructors(class_id);
CREATE INDEX IF NOT EXISTS idx_class_instructors_user  ON public.class_instructors(user_id);

ALTER TABLE public.class_instructors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "class_instructors_all" ON public.class_instructors;
CREATE POLICY "class_instructors_all" ON public.class_instructors
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

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

CREATE INDEX IF NOT EXISTS idx_question_bank_category ON public.lms_question_bank(category);

ALTER TABLE public.lms_question_bank ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.lms_quizzes 
ADD COLUMN IF NOT EXISTS quiz_type TEXT DEFAULT 'exercise'; -- 'exercise' ou 'final_exam'

UPDATE public.lms_quizzes SET quiz_type = 'exercise' WHERE quiz_type IS NULL;

NOTIFY pgrst, 'reload schema';

INSERT INTO storage.buckets (id, name, public)
VALUES ('site_assets', 'site_assets', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Imagens públicas para visualização" ON storage.objects;
CREATE POLICY "Imagens públicas para visualização" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'site_assets');

DROP POLICY IF EXISTS "Upload permitido para autenticados" ON storage.objects;
CREATE POLICY "Upload permitido para autenticados" 
ON storage.objects FOR INSERT 
WITH CHECK (
    bucket_id = 'site_assets' 
    AND auth.role() = 'authenticated'
);

DROP POLICY IF EXISTS "Deleção permitida para autenticados" ON storage.objects;
CREATE POLICY "Deleção permitida para autenticados" 
ON storage.objects FOR DELETE 
USING (
    bucket_id = 'site_assets' 
    AND auth.role() = 'authenticated'
);

DROP POLICY IF EXISTS "Atualização permitida para autenticados" ON storage.objects;
CREATE POLICY "Atualização permitida para autenticados" 
ON storage.objects FOR UPDATE 
USING (
    bucket_id = 'site_assets' 
    AND auth.role() = 'authenticated'
);

CREATE TABLE IF NOT EXISTS public.financial_pins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pin VARCHAR(20) NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'admin',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO public.financial_pins (pin, role) VALUES ('123456', 'admin') ON CONFLICT DO NOTHING;

ALTER TABLE public.financial_pins ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Leitura de Pins Pública" ON public.financial_pins;
CREATE POLICY "Leitura de Pins Pública" ON public.financial_pins FOR SELECT USING (true);

ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS manual_signed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS base_value NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_value NUMERIC DEFAULT 0;

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

ALTER TABLE public.student_evaluations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso as avaliacoes" ON public.student_evaluations;
CREATE POLICY "Acesso as avaliacoes" ON public.student_evaluations FOR ALL USING (true);

ALTER TABLE public.academic_records 
ADD COLUMN IF NOT EXISTS final_status TEXT CHECK (final_status IN ('APROVADO', 'REPROVADO', 'PENDENTE')) DEFAULT 'PENDENTE';

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

ALTER TABLE students 
ADD COLUMN IF NOT EXISTS improvements TEXT DEFAULT '';

COMMENT ON COLUMN students.improvements IS 'Acumulador de anotações descritivas do professor feitas durante o curso';

ALTER TABLE classes 
ADD COLUMN IF NOT EXISTS actual_start_date DATE;

COMMENT ON COLUMN classes.actual_start_date IS 'Data real que a turma foi iniciada na prática, para controle analítico de prazo vs previsto';

ALTER TABLE students 
ADD COLUMN IF NOT EXISTS how_knew VARCHAR(50) DEFAULT 'Amigo',
ADD COLUMN IF NOT EXISTS how_knew_other TEXT;

COMMENT ON COLUMN students.how_knew IS 'Pesquisa Mercado: Como o aluno conheceu o curso (ex: Amigo, Facebook, Instagram, Outro)';
COMMENT ON COLUMN students.how_knew_other IS 'Pesquisa Mercado: Especificação textual livre caso o meio primário seja Outro';

ALTER TABLE users ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{"upload_manual": false}'::jsonb;
COMMENT ON COLUMN users.permissions IS 'Permissões granulares de acesso a funcionalidades específicas';

CREATE TABLE IF NOT EXISTS system_settings (
    key VARCHAR(50) PRIMARY KEY,
    value TEXT,
    updated_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO system_settings (key, value) VALUES ('manual_aluno_url', '') ON CONFLICT (key) DO NOTHING;

UPDATE users SET permissions = '{"upload_manual": true}'::jsonb WHERE role = 'admin' OR role = 'coordenador';

CREATE OR REPLACE FUNCTION prevent_master_user_deletion()
RETURNS TRIGGER AS $$
BEGIN

    IF OLD.full_name ILIKE '%desenvolvedor%' OR OLD.email ILIKE '%desenvolvedor%' THEN
        RAISE EXCEPTION 'Ação Negada: O usuário Mestre (Desenvolvedor) é protegido pelo sistema e não pode ser deletado.';
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS protect_master_user ON users;
CREATE TRIGGER protect_master_user
BEFORE DELETE ON users
FOR EACH ROW
EXECUTE FUNCTION prevent_master_user_deletion();

ALTER TABLE classes ADD COLUMN IF NOT EXISTS actual_end_date DATE;
COMMENT ON COLUMN classes.actual_end_date IS 'Data real em que a turma foi encerrada / finalizada pelo coordenador';

ALTER TABLE public.classes 
ADD COLUMN IF NOT EXISTS price_cash NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS price_card_10x NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS price_installments_3x NUMERIC(10,2);

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

GRANT SELECT ON public.upcoming_classes TO anon;
GRANT SELECT ON public.upcoming_classes TO authenticated;

COMMENT ON VIEW public.upcoming_classes IS 'Lista de turmas disponíveis para venda com preços detalhados para o Agente de IA.';

ALTER TABLE public.classes 
ADD COLUMN IF NOT EXISTS instructor_payment_type TEXT DEFAULT 'fixed' CHECK (instructor_payment_type IN ('fixed', 'split')),
ADD COLUMN IF NOT EXISTS instructor_payment_value NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS address TEXT;

ALTER TABLE public.classes ALTER COLUMN address DROP DEFAULT;

ALTER TABLE public.classes DROP CONSTRAINT IF EXISTS chk_weekend_only;
ALTER TABLE public.classes
ADD CONSTRAINT chk_weekend_only
CHECK (
  (schedule != 'Aula prática - Final de semana' AND schedule NOT ILIKE '%sábado%' AND schedule NOT ILIKE '%sabado%') 
  OR 
  (
    (start_date IS NULL OR EXTRACT(ISODOW FROM start_date) IN (6, 7)) AND 
    (predicted_end_date IS NULL OR EXTRACT(ISODOW FROM predicted_end_date) IN (6, 7))
  )
);

ALTER TABLE public.financial_costs 
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'Outros' 
CHECK (category IN ('Apostila', 'NF', 'Taxa ABENDI', 'Certificado', 'Aluguel Espaço', 'Estação Total', 'Custo Físico Aluno', 'Outros')),
ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL;

ALTER TABLE public.lms_courses 
ADD COLUMN IF NOT EXISTS estimated_physical_cost_per_student NUMERIC(10,2) DEFAULT 0;

NOTIFY pgrst, 'reload schema';

ALTER TABLE public.lms_courses 
ADD COLUMN IF NOT EXISTS instructor_payment_type TEXT DEFAULT 'fixed' CHECK (instructor_payment_type IN ('fixed', 'split')),
ADD COLUMN IF NOT EXISTS instructor_payment_value NUMERIC(10,2) DEFAULT 0;

NOTIFY pgrst, 'reload schema';

ALTER TABLE public.lms_courses 
ADD COLUMN IF NOT EXISTS min_theoretical_hours INT DEFAULT 0;

ALTER TABLE public.lms_quizzes 
ADD COLUMN IF NOT EXISTS time_limit_minutes INT DEFAULT 0; -- 0 significa sem limite

NOTIFY pgrst, 'reload schema';

CREATE TABLE IF NOT EXISTS public.lms_time_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    course_id UUID REFERENCES public.lms_courses(id) ON DELETE CASCADE,
    lesson_id UUID REFERENCES public.lms_lessons(id) ON DELETE SET NULL,
    quiz_id UUID REFERENCES public.lms_quizzes(id) ON DELETE SET NULL,
    duration_seconds INT NOT NULL DEFAULT 30,
    recorded_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.lms_time_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participantes podem enviar seus próprios logs" ON public.lms_time_logs;
CREATE POLICY "Participantes podem enviar seus próprios logs" ON public.lms_time_logs
    FOR INSERT WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS "Gestores podem ver todos os logs" ON public.lms_time_logs;
CREATE POLICY "Gestores podem ver todos os logs" ON public.lms_time_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role IN ('admin', 'coordenador', 'atendente')
        )
    );

DROP POLICY IF EXISTS "Alunos podem ver seus próprios logs" ON public.lms_time_logs;
CREATE POLICY "Alunos podem ver seus próprios logs" ON public.lms_time_logs
    FOR SELECT USING (auth.uid() = student_id);

NOTIFY pgrst, 'reload schema';

ALTER TABLE public.lms_quiz_results
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

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

ALTER TABLE public.lms_quiz_results
DROP CONSTRAINT IF EXISTS lms_quiz_results_student_quiz_unique;

ALTER TABLE public.lms_quiz_results
ADD CONSTRAINT lms_quiz_results_student_quiz_unique 
UNIQUE (student_id, quiz_id);


DROP POLICY IF EXISTS "Alunos podem ver seus resultados de quiz" ON public.lms_quiz_results;
CREATE POLICY "Alunos podem ver seus resultados de quiz"
ON public.lms_quiz_results FOR SELECT
TO authenticated
USING (student_id = auth.uid());


DROP POLICY IF EXISTS "Alunos podem inserir seus resultados de quiz" ON public.lms_quiz_results;
CREATE POLICY "Alunos podem inserir seus resultados de quiz"
ON public.lms_quiz_results FOR INSERT
TO authenticated
WITH CHECK (student_id = auth.uid());


DROP POLICY IF EXISTS "Alunos podem atualizar seus resultados de quiz" ON public.lms_quiz_results;
CREATE POLICY "Alunos podem atualizar seus resultados de quiz"
ON public.lms_quiz_results FOR UPDATE
TO authenticated
USING (student_id = auth.uid())
WITH CHECK (student_id = auth.uid());


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

NOTIFY pgrst, 'reload schema';

ALTER TABLE public.lms_lessons 
ADD COLUMN IF NOT EXISTS pdf_url TEXT;

ALTER TABLE public.lms_quizzes 
ADD COLUMN IF NOT EXISTS quiz_type TEXT DEFAULT 'exercise'; -- 'exercise' | 'final_exam'

NOTIFY pgrst, 'reload schema';


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


DROP POLICY IF EXISTS "Admins podem ver todos os cursos" ON public.lms_courses;
CREATE POLICY "Admins podem ver todos os cursos" 
ON public.lms_courses FOR SELECT 
TO authenticated 
USING (true);

NOTIFY pgrst, 'reload schema';

ALTER TABLE public.classes
    ADD COLUMN IF NOT EXISTS instructor_payment_type  VARCHAR(20)  NOT NULL DEFAULT 'fixed'
        CHECK (instructor_payment_type IN ('fixed', 'split')),
    ADD COLUMN IF NOT EXISTS instructor_payment_value NUMERIC(10,2) NOT NULL DEFAULT 0;

NOTIFY pgrst, 'reload schema';

ALTER TABLE public.lms_courses
    ADD COLUMN IF NOT EXISTS instructor_payment_type  VARCHAR(20)  NOT NULL DEFAULT 'fixed'
        CHECK (instructor_payment_type IN ('fixed', 'split')),
    ADD COLUMN IF NOT EXISTS instructor_payment_value NUMERIC(10,2) NOT NULL DEFAULT 0;

NOTIFY pgrst, 'reload schema';

ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS base_value NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_value NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS manual_signed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS has_lms_access BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_online_only BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS how_knew TEXT,
ADD COLUMN IF NOT EXISTS how_knew_other TEXT;

NOTIFY pgrst, 'reload schema';

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

UPDATE public.classes
SET schedule = 'Seg a Sex 19h as 21h'
WHERE actual_start_date IS NULL 
  AND actual_end_date IS NULL
  AND (course_name LIKE '%(CD-CL)%' OR course_name LIKE '%(CD-CM)%');

UPDATE public.classes
SET schedule = 'Seg a Sex 20h as 22h'
WHERE actual_start_date IS NULL 
  AND actual_end_date IS NULL
  AND course_name LIKE '%(CD-TO)%';

ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS is_immediate_start BOOLEAN DEFAULT false;

ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'coordenador', 'atendente', 'instrutor', 'student', 'aluno')) NOT VALID;

ALTER TABLE public.students ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS requires_password_change BOOLEAN DEFAULT true;

INSERT INTO storage.buckets (id, name, public) VALUES ('student_documents', 'student_documents', false) ON CONFLICT DO NOTHING;

DROP POLICY IF EXISTS "Alunos podem ver seus proprios documentos" ON storage.objects;
CREATE POLICY "Alunos podem ver seus proprios documentos" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'student_documents' AND auth.uid()::text = (storage.foldername(name))[1]);
DROP POLICY IF EXISTS "Alunos podem inserir seus proprios documentos" ON storage.objects;
CREATE POLICY "Alunos podem inserir seus proprios documentos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'student_documents' AND auth.uid()::text = (storage.foldername(name))[1]);
DROP POLICY IF EXISTS "Admins podem ver todos os documentos" ON storage.objects;
CREATE POLICY "Admins podem ver todos os documentos" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'student_documents' AND EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'coordenador', 'atendente')));

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  webdesigner_id UUID;
  secretaria_id UUID;
BEGIN
  -- Webdesigner
  SELECT id INTO webdesigner_id FROM auth.users WHERE email = 'webdesigner@cec.com.br';
  IF webdesigner_id IS NULL THEN
    webdesigner_id := gen_random_uuid();
    INSERT INTO auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES (
      webdesigner_id, 'authenticated', 'authenticated', 'webdesigner@cec.com.br', crypt('123456', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()
    );
  END IF;

  INSERT INTO auth.identities (id, provider_id, user_id, identity_data, provider, created_at, updated_at)
  VALUES (
    gen_random_uuid(), webdesigner_id::text, webdesigner_id, format('{"sub":"%s","email":"%s"}', webdesigner_id::text, 'webdesigner@cec.com.br')::jsonb, 'email', now(), now()
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.users (id, email, full_name, role)
  VALUES (webdesigner_id, 'webdesigner@cec.com.br', 'Master Webdesigner', 'admin')
  ON CONFLICT (id) DO UPDATE SET role = 'admin';

  -- Secretaria
  SELECT id INTO secretaria_id FROM auth.users WHERE email = 'secretaria@cursocec.com.br';
  IF secretaria_id IS NULL THEN
    secretaria_id := gen_random_uuid();
    INSERT INTO auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES (
      secretaria_id, 'authenticated', 'authenticated', 'secretaria@cursocec.com.br', crypt('123456', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()
    );
  END IF;

  INSERT INTO auth.identities (id, provider_id, user_id, identity_data, provider, created_at, updated_at)
  VALUES (
    gen_random_uuid(), secretaria_id::text, secretaria_id, format('{"sub":"%s","email":"%s"}', secretaria_id::text, 'secretaria@cursocec.com.br')::jsonb, 'email', now(), now()
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.users (id, email, full_name, role)
  VALUES (secretaria_id, 'secretaria@cursocec.com.br', 'Secretaria CEC', 'admin')
  ON CONFLICT (id) DO UPDATE SET role = 'admin';

END $$;

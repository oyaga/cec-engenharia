-- =====================================================================
-- SPRINT C — SEGURANÇA: MIGRAÇÕES DO BANCO DE DADOS E STORAGE (COMPLETA)
-- Projeto: cursocec.com.br — C&C Engenharia e Capacitação
-- Executar no SQL Editor do Supabase Cloud
-- =====================================================================

-- ═══════════════════════════════════════
-- 1. CRIAÇÃO DAS TABELAS AUSENTES
-- ═══════════════════════════════════════

-- A) Tabela de despesas (expenses)
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    description TEXT NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    due_date DATE NOT NULL,
    category TEXT NOT NULL,
    status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago')),
    receipt_base64 TEXT,
    class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL
);

-- B) Tabela de equipe interna (staff)
CREATE TABLE IF NOT EXISTS public.staff (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    cpf TEXT UNIQUE,
    role TEXT NOT NULL, -- atendente, coordenador, instrutor, administrativo, financeiro_externo, outro
    email TEXT,
    phone TEXT,
    admission_date DATE,
    salary NUMERIC(10,2),
    has_platform_access BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- C) Tabela de mensagens e chat (messages)
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    receiver_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- D) Tabela de comunicados (announcements)
CREATE TABLE IF NOT EXISTS public.announcements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    target_roles TEXT[] NOT NULL,
    is_pinned BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMPTZ,
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- E) Tabela de lista de desejos (course_wishlist)
CREATE TABLE IF NOT EXISTS public.course_wishlist (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    course_id UUID REFERENCES public.lms_courses(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_user_course_wishlist UNIQUE (user_id, course_id)
);

-- F) Tabela de notificações internas (lms_notifications)
CREATE TABLE IF NOT EXISTS public.lms_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    type TEXT NOT NULL, -- 'message', 'forum', 'grade', 'info', 'finance'
    link TEXT,
    is_read BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);


-- ═══════════════════════════════════════
-- 2. FUNÇÕES AUXILIARES CONTRA RECURSÃO (SECURITY DEFINER)
-- ═══════════════════════════════════════
-- Criadas para evitar erro clássico de "recursão infinita" ao fazer SELECT na tabela users dentro do RLS

CREATE OR REPLACE FUNCTION public.is_admin_or_coordinator()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
    AND role IN ('admin', 'coordenador')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
    AND role IN ('admin', 'coordenador', 'atendente')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_staff_or_instructor()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
    AND role IN ('admin', 'coordenador', 'atendente', 'instrutor')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_instructor_or_coordinator()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
    AND role IN ('admin', 'coordenador', 'instrutor')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- ═══════════════════════════════════════
-- 3. HABILITAR ROW LEVEL SECURITY (RLS)
-- ═══════════════════════════════════════
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lms_student_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lms_quiz_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instructor_qualifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lms_forum_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lms_forum_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_wishlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lms_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lms_course_ratings ENABLE ROW LEVEL SECURITY;


-- ═══════════════════════════════════════
-- 4. REMOVER POLÍTICAS ANTIGAS E INSEGURAS
-- ═══════════════════════════════════════
-- Remove a política genérica de acesso total para usuários autenticados
DROP POLICY IF EXISTS "Liberar acesso total às tabelas para todo usuário autenticado" ON public.users;
DROP POLICY IF EXISTS "Liberar acesso total às tabelas para todo usuário autenticado" ON public.students;
DROP POLICY IF EXISTS "Liberar acesso total às tabelas para todo usuário autenticado" ON public.financial_records;
DROP POLICY IF EXISTS "Liberar acesso total às tabelas para todo usuário autenticado" ON public.financial_costs;
DROP POLICY IF EXISTS "Liberar acesso total às tabelas para todo usuário autenticado" ON public.attendance_records;
DROP POLICY IF EXISTS "Liberar acesso total às tabelas para todo usuário autenticado" ON public.academic_records;
DROP POLICY IF EXISTS "Liberar acesso total às tabelas para todo usuário autenticado" ON public.student_documents;
DROP POLICY IF EXISTS "Liberar acesso total às tabelas para todo usuário autenticado" ON public.class_logs;
DROP POLICY IF EXISTS "Liberar acesso total às tabelas para todo usuário autenticado" ON public.invoices_tracking;
DROP POLICY IF EXISTS "Liberar acesso total às tabelas para todo usuário autenticado" ON public.audit_logs;

-- Remove políticas antigas de tabelas específicas
DROP POLICY IF EXISTS "Usuários podem ver seu próprio perfil" ON public.users;
DROP POLICY IF EXISTS "Usuários podem atualizar sua própria senha_flag" ON public.users;
DROP POLICY IF EXISTS "Alunos acessam apenas suas proprias matriculas" ON public.enrollments;
DROP POLICY IF EXISTS "Admins gerenciam todas as matriculas" ON public.enrollments;
DROP POLICY IF EXISTS "Public enrollment insert" ON public.enrollments;
DROP POLICY IF EXISTS "Permitir leitura de qualificações para autenticados" ON public.instructor_qualifications;
DROP POLICY IF EXISTS "Staff manage staff" ON public.staff;
DROP POLICY IF EXISTS "Admin & Coord manage expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users read expenses" ON public.expenses;
DROP POLICY IF EXISTS "Admin enrollment manage" ON public.enrollments;

-- Remove políticas da auditoria anterior para recriação sem recursão
DROP POLICY IF EXISTS "users_self_access" ON public.users;
DROP POLICY IF EXISTS "users_admin_access" ON public.users;
DROP POLICY IF EXISTS "students_self_access" ON public.students;
DROP POLICY IF EXISTS "students_staff_access" ON public.students;
DROP POLICY IF EXISTS "enrollments_self_access" ON public.enrollments;
DROP POLICY IF EXISTS "enrollments_staff_access" ON public.enrollments;
DROP POLICY IF EXISTS "enrollments_public_insert" ON public.enrollments;
DROP POLICY IF EXISTS "financial_records_self_access" ON public.financial_records;
DROP POLICY IF EXISTS "financial_records_read_staff" ON public.financial_records;
DROP POLICY IF EXISTS "financial_records_manage_admin" ON public.financial_records;
DROP POLICY IF EXISTS "expenses_manage_admin" ON public.expenses;
DROP POLICY IF EXISTS "expenses_read_staff" ON public.expenses;
DROP POLICY IF EXISTS "financial_costs_manage_admin" ON public.financial_costs;
DROP POLICY IF EXISTS "financial_costs_read_staff" ON public.financial_costs;
DROP POLICY IF EXISTS "attendance_self_access" ON public.attendance_records;
DROP POLICY IF EXISTS "attendance_staff_access" ON public.attendance_records;
DROP POLICY IF EXISTS "progress_self_access" ON public.lms_student_progress;
DROP POLICY IF EXISTS "progress_staff_access" ON public.lms_student_progress;
DROP POLICY IF EXISTS "quiz_self_access" ON public.lms_quiz_results;
DROP POLICY IF EXISTS "quiz_staff_access" ON public.lms_quiz_results;
DROP POLICY IF EXISTS "instructor_qual_self" ON public.instructor_qualifications;
DROP POLICY IF EXISTS "instructor_qual_admin" ON public.instructor_qualifications;
DROP POLICY IF EXISTS "staff_self_access" ON public.staff;
DROP POLICY IF EXISTS "staff_admin_access" ON public.staff;
DROP POLICY IF EXISTS "audit_logs_admin" ON public.audit_logs;
DROP POLICY IF EXISTS "messages_insert_self" ON public.messages;
DROP POLICY IF EXISTS "messages_select_self" ON public.messages;
DROP POLICY IF EXISTS "messages_update_self" ON public.messages;
DROP POLICY IF EXISTS "forum_topics_all" ON public.lms_forum_topics;
DROP POLICY IF EXISTS "forum_replies_all" ON public.lms_forum_replies;
DROP POLICY IF EXISTS "announcements_read_all" ON public.announcements;
DROP POLICY IF EXISTS "announcements_manage_admin" ON public.announcements;
DROP POLICY IF EXISTS "wishlist_self_access" ON public.course_wishlist;
DROP POLICY IF EXISTS "notifications_self_access" ON public.lms_notifications;
DROP POLICY IF EXISTS "notifications_insert_system" ON public.lms_notifications;
DROP POLICY IF EXISTS "ratings_read_all" ON public.lms_course_ratings;
DROP POLICY IF EXISTS "ratings_manage_self" ON public.lms_course_ratings;


-- ═══════════════════════════════════════
-- 5. DEFINIR NOVAS POLÍTICAS DE RLS RESTRITIVAS (SEM RECURSÃO)
-- ═══════════════════════════════════════

-- 5.1. TABELA: users
CREATE POLICY "users_self_access" ON public.users
    FOR ALL TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

CREATE POLICY "users_admin_access" ON public.users
    FOR ALL TO authenticated
    USING (public.is_admin_or_coordinator());

-- 5.2. TABELA: students
CREATE POLICY "students_self_access" ON public.students
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "students_staff_access" ON public.students
    FOR ALL TO authenticated
    USING (public.is_staff());

-- 5.3. TABELA: enrollments (Não tem student_id, vinculação é feita pelo email)
CREATE POLICY "enrollments_self_access" ON public.enrollments
    FOR SELECT TO authenticated
    USING (email = (SELECT email FROM public.users WHERE id = auth.uid()));

CREATE POLICY "enrollments_staff_access" ON public.enrollments
    FOR ALL TO authenticated
    USING (public.is_staff());

CREATE POLICY "enrollments_public_insert" ON public.enrollments
    FOR INSERT WITH CHECK (true);

-- 5.4. TABELA: financial_records
CREATE POLICY "financial_records_self_access" ON public.financial_records
    FOR SELECT TO authenticated
    USING (student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid()));

CREATE POLICY "financial_records_read_staff" ON public.financial_records
    FOR SELECT TO authenticated
    USING (public.is_staff());

CREATE POLICY "financial_records_manage_admin" ON public.financial_records
    FOR ALL TO authenticated
    USING (public.is_admin_or_coordinator());

-- 5.5. TABELA: financial_costs & expenses
CREATE POLICY "expenses_manage_admin" ON public.expenses
    FOR ALL TO authenticated
    USING (public.is_admin_or_coordinator());

CREATE POLICY "expenses_read_staff" ON public.expenses
    FOR SELECT TO authenticated
    USING (public.is_staff());

CREATE POLICY "financial_costs_manage_admin" ON public.financial_costs
    FOR ALL TO authenticated
    USING (public.is_admin_or_coordinator());

CREATE POLICY "financial_costs_read_staff" ON public.financial_costs
    FOR SELECT TO authenticated
    USING (public.is_staff());

-- 5.6. TABELA: attendance_records
CREATE POLICY "attendance_self_access" ON public.attendance_records
    FOR SELECT TO authenticated
    USING (student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid()));

CREATE POLICY "attendance_staff_access" ON public.attendance_records
    FOR ALL TO authenticated
    USING (public.is_staff_or_instructor());

-- 5.7. TABELA: lms_student_progress (student_id aponta direto para auth.users)
CREATE POLICY "progress_self_access" ON public.lms_student_progress
    FOR SELECT TO authenticated
    USING (student_id = auth.uid());

CREATE POLICY "progress_staff_access" ON public.lms_student_progress
    FOR ALL TO authenticated
    USING (public.is_staff_or_instructor());

-- 5.8. TABELA: lms_quiz_results (student_id aponta direto para auth.users)
CREATE POLICY "quiz_self_access" ON public.lms_quiz_results
    FOR SELECT TO authenticated
    USING (student_id = auth.uid());

CREATE POLICY "quiz_staff_access" ON public.lms_quiz_results
    FOR ALL TO authenticated
    USING (public.is_instructor_or_coordinator());

-- 5.9. TABELA: instructor_qualifications
CREATE POLICY "instructor_qual_self" ON public.instructor_qualifications
    FOR ALL TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "instructor_qual_admin" ON public.instructor_qualifications
    FOR ALL TO authenticated
    USING (public.is_admin_or_coordinator());

-- 5.10. TABELA: staff
CREATE POLICY "staff_self_access" ON public.staff
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "staff_admin_access" ON public.staff
    FOR ALL TO authenticated
    USING (public.is_admin_or_coordinator());

-- 5.11. TABELA: audit_logs
CREATE POLICY "audit_logs_admin" ON public.audit_logs
    FOR ALL TO authenticated
    USING (public.is_admin_or_coordinator());

-- 5.12. TABELA: messages
CREATE POLICY "messages_insert_self" ON public.messages
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "messages_select_self" ON public.messages
    FOR SELECT TO authenticated
    USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "messages_update_self" ON public.messages
    FOR UPDATE TO authenticated
    USING (auth.uid() = receiver_id)
    WITH CHECK (auth.uid() = receiver_id);

-- 5.13. TABELAS: lms_forum_topics & lms_forum_replies
CREATE POLICY "forum_topics_all" ON public.lms_forum_topics
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "forum_replies_all" ON public.lms_forum_replies
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (auth.role() = 'authenticated');

-- 5.14. TABELA: announcements
CREATE POLICY "announcements_read_all" ON public.announcements
    FOR SELECT TO authenticated
    USING (expires_at IS NULL OR expires_at > NOW());

CREATE POLICY "announcements_manage_admin" ON public.announcements
    FOR ALL TO authenticated
    USING (public.is_admin_or_coordinator());

-- 5.15. TABELA: course_wishlist
CREATE POLICY "wishlist_self_access" ON public.course_wishlist
    FOR ALL TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- 5.16. TABELA: lms_notifications
CREATE POLICY "notifications_self_access" ON public.lms_notifications
    FOR ALL TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "notifications_insert_system" ON public.lms_notifications
    FOR INSERT TO authenticated
    WITH CHECK (auth.role() = 'authenticated');

-- 5.17. TABELA: lms_course_ratings (student_id aponta direto para auth.users)
CREATE POLICY "ratings_read_all" ON public.lms_course_ratings
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "ratings_manage_self" ON public.lms_course_ratings
    FOR ALL TO authenticated
    USING (student_id = auth.uid())
    WITH CHECK (student_id = auth.uid());


-- ═══════════════════════════════════════
-- 6. REVOGAR PRIVILÉGIOS DA ROLE PUBLIC/ANON
-- ═══════════════════════════════════════
REVOKE ALL ON public.users FROM anon;
REVOKE ALL ON public.students FROM anon;
REVOKE ALL ON public.enrollments FROM anon;
REVOKE ALL ON public.financial_records FROM anon;
REVOKE ALL ON public.financial_costs FROM anon;
REVOKE ALL ON public.expenses FROM anon;
REVOKE ALL ON public.audit_logs FROM anon;
REVOKE ALL ON public.instructor_qualifications FROM anon;
REVOKE ALL ON public.staff FROM anon;
REVOKE ALL ON public.messages FROM anon;
REVOKE ALL ON public.announcements FROM anon;
REVOKE ALL ON public.course_wishlist FROM anon;
REVOKE ALL ON public.lms_notifications FROM anon;

-- Reestabelece apenas o SELECT para a tabela de cursos e certificados que precisam ser públicos
GRANT SELECT ON public.lms_courses TO anon;
GRANT SELECT ON public.lms_certificate_configs TO anon;

-- Permitir inserção de matrículas de forma anônima (compras sem cadastro prévio no site)
GRANT INSERT ON public.enrollments TO anon;


-- ═══════════════════════════════════════
-- 7. SEGURANÇA DE STORAGE (BUCKETS PRIVADOS)
-- ═══════════════════════════════════════

-- A) Mudar status dos buckets para privado
UPDATE storage.buckets SET public = false WHERE id IN ('student_documents', 'instructor_documents', 'expense_receipts');

-- B) Remover políticas antigas de Storage
DROP POLICY IF EXISTS "aluno_acessa_proprios_docs" ON storage.objects;
DROP POLICY IF EXISTS "instrutor_acessa_proprios_docs" ON storage.objects;
DROP POLICY IF EXISTS "gestores_acessam_recibos_despesas" ON storage.objects;

-- C) Criar nova política de Storage para student_documents
CREATE POLICY "aluno_acessa_proprios_docs"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'student_documents'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR
    public.is_staff()
  )
);

-- D) Criar nova política de Storage para instructor_documents
CREATE POLICY "instrutor_acessa_proprios_docs"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'instructor_documents'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR
    public.is_admin_or_coordinator()
  )
);

-- E) Criar nova política de Storage para expense_receipts
CREATE POLICY "gestores_acessam_recibos_despesas"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'expense_receipts'
  AND public.is_admin_or_coordinator()
);

NOTIFY pgrst, 'reload schema';

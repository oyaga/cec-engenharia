-- =====================================================================
-- FASE 26 — SEGURANÇA E PERMISSÕES DO LMS (COMPLETA)
-- Projeto: cursocec.com.br — C&C Engenharia e Capacitação
-- Executar no SQL Editor do Supabase Cloud
-- =====================================================================

-- ═══════════════════════════════════════
-- 1. ATUALIZAÇÃO DAS FUNÇÕES DE SEGURANÇA
-- ═══════════════════════════════════════
-- Inclui o cargo 'administrativo' (como Carlos, Ricson e Maria Clara) nas definições de staff
-- Isso permite que eles leiam e alterem dados de alunos e matrículas que dependem destas funções.

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
    AND role IN ('admin', 'coordenador', 'atendente', 'administrativo')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_staff_or_instructor()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
    AND role IN ('admin', 'coordenador', 'atendente', 'instrutor', 'administrativo')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- ═══════════════════════════════════════
-- 2. LIBERAÇÃO DE LEITURA (SELECT) DO LMS PARA OS ALUNOS
-- ═══════════════════════════════════════
-- Permite que qualquer usuário autenticado (incluindo alunos) veja os módulos, aulas, quizzes e questões.

DROP POLICY IF EXISTS "Alunos podem visualizar modulos" ON public.lms_modules;
CREATE POLICY "Alunos podem visualizar modulos"
ON public.lms_modules FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Alunos podem visualizar aulas" ON public.lms_lessons;
CREATE POLICY "Alunos podem visualizar aulas"
ON public.lms_lessons FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Alunos podem visualizar quizzes" ON public.lms_quizzes;
CREATE POLICY "Alunos podem visualizar quizzes"
ON public.lms_quizzes FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Alunos podem visualizar questoes" ON public.lms_questions;
CREATE POLICY "Alunos podem visualizar questoes"
ON public.lms_questions FOR SELECT
TO authenticated
USING (true);


-- ═══════════════════════════════════════
-- 3. PERMISSÃO DE GERENCIAMENTO (ALL) PARA CARGO ADMINISTRATIVO
-- ═══════════════════════════════════════
-- Permite que admins, coordenadores e administrativos gerenciem todo o LMS.

-- A) CURSOS
DROP POLICY IF EXISTS "Administradores podem gerenciar cursos" ON public.lms_courses;
CREATE POLICY "Administradores podem gerenciar cursos" 
ON public.lms_courses FOR ALL 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE users.id = auth.uid() 
        AND users.role IN ('admin', 'coordenador', 'administrativo')
    )
);

-- B) MÓDULOS
DROP POLICY IF EXISTS "Administradores podem gerenciar modulos" ON public.lms_modules;
CREATE POLICY "Administradores podem gerenciar modulos" 
ON public.lms_modules FOR ALL 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE users.id = auth.uid() 
        AND users.role IN ('admin', 'coordenador', 'administrativo')
    )
);

-- C) AULAS
DROP POLICY IF EXISTS "Administradores podem gerenciar aulas" ON public.lms_lessons;
CREATE POLICY "Administradores podem gerenciar aulas" 
ON public.lms_lessons FOR ALL 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE users.id = auth.uid() 
        AND users.role IN ('admin', 'coordenador', 'administrativo')
    )
);

-- D) QUIZZES
DROP POLICY IF EXISTS "Administradores podem gerenciar quizzes" ON public.lms_quizzes;
CREATE POLICY "Administradores podem gerenciar quizzes" 
ON public.lms_quizzes FOR ALL 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE users.id = auth.uid() 
        AND users.role IN ('admin', 'coordenador', 'administrativo')
    )
);

-- E) QUESTÕES
DROP POLICY IF EXISTS "Administradores podem gerenciar questoes" ON public.lms_questions;
CREATE POLICY "Administradores podem gerenciar questoes" 
ON public.lms_questions FOR ALL 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE users.id = auth.uid() 
        AND users.role IN ('admin', 'coordenador', 'administrativo')
    )
);


-- ═══════════════════════════════════════
-- 4. POLÍTICAS DE STORAGE (BUCKET 'LMS-DOCS')
-- ═══════════════════════════════════════
-- Permite upload (INSERT) e exclusão (DELETE) de arquivos de aula por admins, coordenadores e administrativos.

DROP POLICY IF EXISTS "Admins podem subir documentos LMS" ON storage.objects;
CREATE POLICY "Admins podem subir documentos LMS"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'lms-docs' AND
    (EXISTS (
        SELECT 1 FROM public.users 
        WHERE users.id = auth.uid() 
        AND users.role IN ('admin', 'coordenador', 'administrativo')
    ))
);

DROP POLICY IF EXISTS "Admins podem excluir documentos LMS" ON storage.objects;
CREATE POLICY "Admins podem excluir documentos LMS"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'lms-docs' AND
    (EXISTS (
        SELECT 1 FROM public.users 
        WHERE users.id = auth.uid() 
        AND users.role IN ('admin', 'coordenador', 'administrativo')
    ))
);

-- Forçar recarga do schema do PostgREST
NOTIFY pgrst, 'reload schema';

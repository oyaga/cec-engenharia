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

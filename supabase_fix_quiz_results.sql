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

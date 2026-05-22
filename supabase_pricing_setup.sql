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

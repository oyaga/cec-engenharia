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

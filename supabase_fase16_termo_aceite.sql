-- 1. Adicionar coluna terms_accepted na tabela students se não existir
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS terms_accepted BOOLEAN DEFAULT false;

-- 2. Adicionar comentário na coluna para documentação
COMMENT ON COLUMN public.students.terms_accepted IS 'Indica se o aluno aceitou o termo de prazo de conclusão de 6 meses no seu primeiro acesso.';

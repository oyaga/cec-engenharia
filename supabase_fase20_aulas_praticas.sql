-- ==========================================================
-- SCRIPT DE MIGRAÇÃO: ADIÇÃO DE AGENDAMENTO DE AULA PRÁTICA
-- Executar este script no Editor SQL do Supabase Cloud
-- C&C Engenharia e Capacitação — cursocec.com.br
-- ==========================================================

-- 1. Adicionar coluna max_capacity na tabela classes para limite de alunos por final de semana
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS max_capacity INTEGER DEFAULT 10;
COMMENT ON COLUMN public.classes.max_capacity IS 'Capacidade máxima de alunos permitida em turmas práticas ou convencionais.';

-- 2. Adicionar coluna practical_class_id na tabela students para vincular aluno a um slot de final de semana
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS practical_class_id UUID;
COMMENT ON COLUMN public.students.practical_class_id IS 'Identificador da turma de aula prática de final de semana agendada para o aluno.';

-- 2.1 Adicionar coluna practical_class_status na tabela students para gerenciar o fluxo de aprovacao
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS practical_class_status VARCHAR(50) DEFAULT 'pendente';
COMMENT ON COLUMN public.students.practical_class_status IS 'Status do agendamento da aula prática (pendente ou confirmado).';

-- 3. Adicionar restrição de chave estrangeira com segurança de integridade (ON DELETE SET NULL)
ALTER TABLE public.students DROP CONSTRAINT IF EXISTS fk_students_practical_class;
ALTER TABLE public.students 
  ADD CONSTRAINT fk_students_practical_class 
  FOREIGN KEY (practical_class_id) REFERENCES public.classes(id) 
  ON DELETE SET NULL;

-- 4. Notificar alteração de esquema para atualizar PostgREST
NOTIFY pgrst, 'reload schema';

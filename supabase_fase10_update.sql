-- ==========================================
-- SUPER APP ICC - ATUALIZAÇÃO FASE 10
-- Injeção do Campo Data Real de Início da Turma
-- ==========================================

-- 1. Adicionando a coluna de 'actual_start_date' na tabela de turmas
ALTER TABLE classes 
ADD COLUMN IF NOT EXISTS actual_start_date DATE;

-- Comentário da Modificação
COMMENT ON COLUMN classes.actual_start_date IS 'Data real que a turma foi iniciada na prática, para controle analítico de prazo vs previsto';

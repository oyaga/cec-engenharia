-- ==========================================
-- SUPER APP ICC - ATUALIZAÇÃO FASE 12
-- Injeção do Módulo de Marketing / Captação
-- ==========================================

-- 1. Adicionando opções de origem (Pesquisa de Marketing) na tabela de alunos
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS how_knew VARCHAR(50) DEFAULT 'Amigo',
ADD COLUMN IF NOT EXISTS how_knew_other TEXT;

-- Comentário da Modificação
COMMENT ON COLUMN students.how_knew IS 'Pesquisa Mercado: Como o aluno conheceu o curso (ex: Amigo, Facebook, Instagram, Outro)';
COMMENT ON COLUMN students.how_knew_other IS 'Pesquisa Mercado: Especificação textual livre caso o meio primário seja Outro';

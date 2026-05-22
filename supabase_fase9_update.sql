-- ==========================================
-- SUPER APP ICC - ATUALIZAÇÃO FASE 9
-- Injeção do Campo de Melhorias Contínuas
-- ==========================================

-- 1. Adicionando a coluna de 'improvements' na tabela principal de alunos
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS improvements TEXT DEFAULT '';

-- Comentário da Modificação
COMMENT ON COLUMN students.improvements IS 'Acumulador de anotações descritivas do professor feitas durante o curso';

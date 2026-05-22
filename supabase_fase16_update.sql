-- ==========================================
-- SUPER APP ICC - ATUALIZAÇÃO FASE 16
-- Motor de Encerramento e Datas Reais
-- ==========================================

-- 1. Adicionando coluna para registrar o Término REAL da Turma
ALTER TABLE classes ADD COLUMN IF NOT EXISTS actual_end_date DATE;
COMMENT ON COLUMN classes.actual_end_date IS 'Data real em que a turma foi encerrada / finalizada pelo coordenador';

-- CONTROLE DE TEMPO LMS
-- 1. Carga horária mínima do curso (Teórico)
ALTER TABLE public.lms_courses 
ADD COLUMN IF NOT EXISTS min_theoretical_hours INT DEFAULT 0;

-- 2. Limite de tempo para realização da prova (em minutos)
ALTER TABLE public.lms_quizzes 
ADD COLUMN IF NOT EXISTS time_limit_minutes INT DEFAULT 0; -- 0 significa sem limite

-- Forçar reload do schema
NOTIFY pgrst, 'reload schema';

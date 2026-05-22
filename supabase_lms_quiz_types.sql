-- DIFERENCIAÇÃO DE TIPOS DE AVALIAÇÃO
ALTER TABLE public.lms_quizzes 
ADD COLUMN IF NOT EXISTS quiz_type TEXT DEFAULT 'exercise'; -- 'exercise' ou 'final_exam'

-- Garantir que as provas existentes sejam tratadas como exercícios por padrão
UPDATE public.lms_quizzes SET quiz_type = 'exercise' WHERE quiz_type IS NULL;

-- Recarregar schema
NOTIFY pgrst, 'reload schema';

-- AJUSTES LMS: PDF E TIPOS DE PROVA
-- 1. Suporte a PDF nas aulas
ALTER TABLE public.lms_lessons 
ADD COLUMN IF NOT EXISTS pdf_url TEXT;

-- 2. Diferenciação de tipos de quiz
ALTER TABLE public.lms_quizzes 
ADD COLUMN IF NOT EXISTS quiz_type TEXT DEFAULT 'exercise'; -- 'exercise' | 'final_exam'

-- 3. Criar bucket para documentos se não existir (Opcional, mas recomendado)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('lms-docs', 'lms-docs', true) ON CONFLICT (id) DO NOTHING;

NOTIFY pgrst, 'reload schema';

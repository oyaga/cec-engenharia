-- =====================================================================
-- CORREÇÃO DE CHAVES ESTRANGEIRAS DO FÓRUM DO LMS
-- Executar no SQL Editor do Supabase Cloud
-- =====================================================================

-- A. Tópicos do Fórum (lms_forum_topics)
-- 1. Remover a restrição de chave estrangeira antiga apontando para auth.users
ALTER TABLE public.lms_forum_topics 
DROP CONSTRAINT IF EXISTS lms_forum_topics_student_id_fkey;

-- 2. Adicionar a restrição de chave estrangeira correta apontando para public.users
ALTER TABLE public.lms_forum_topics 
ADD CONSTRAINT lms_forum_topics_student_id_fkey 
FOREIGN KEY (student_id) 
REFERENCES public.users(id) 
ON DELETE CASCADE;


-- B. Respostas do Fórum (lms_forum_replies)
-- 1. Remover a restrição de chave estrangeira antiga apontando para auth.users
ALTER TABLE public.lms_forum_replies 
DROP CONSTRAINT IF EXISTS lms_forum_replies_author_id_fkey;

-- 2. Adicionar a restrição de chave estrangeira correta apontando para public.users
ALTER TABLE public.lms_forum_replies 
ADD CONSTRAINT lms_forum_replies_author_id_fkey 
FOREIGN KEY (author_id) 
REFERENCES public.users(id) 
ON DELETE CASCADE;


-- C. Notificar Recarga de Schema do PostgREST
NOTIFY pgrst, 'reload schema';

-- CORREÇÃO DEFINITIVA DO SCHEMA DA TABELA STUDENTS
-- Este script adiciona as colunas que estavam faltando e que o código tenta usar.

ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS base_value NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_value NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS manual_signed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS has_lms_access BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_online_only BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS how_knew TEXT,
ADD COLUMN IF NOT EXISTS how_knew_other TEXT;

-- Forçar o Supabase a atualizar o cache do mapa de colunas
NOTIFY pgrst, 'reload schema';

-- Verificação final (rode isto para ter certeza que tudo apareceu)
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'students' 
AND column_name IN (
    'base_value', 
    'discount_value', 
    'manual_signed', 
    'has_lms_access', 
    'is_online_only'
);

-- Adicionar coluna 'is_immediate_start' para suportar turmas sem data fixa
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS is_immediate_start BOOLEAN DEFAULT false;

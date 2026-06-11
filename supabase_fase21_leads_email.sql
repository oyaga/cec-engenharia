-- Adiciona a coluna email na tabela public.leads para a integração com a Maria Antônia (N8N)
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS email TEXT;

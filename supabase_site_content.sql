-- ============================================================
-- TABELA DE CONTEÚDO DO SITE (site_content)
-- Armazena todos os textos, imagens e configurações editáveis
-- ============================================================

CREATE TABLE IF NOT EXISTS public.site_content (
  id TEXT PRIMARY KEY, -- Ex: 'main-content'
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Habilitar RLS
ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;

-- 1. Qualquer pessoa (incluindo visitantes) pode VER o conteúdo
DROP POLICY IF EXISTS "Qualquer um pode ver o conteúdo do site" ON public.site_content;
CREATE POLICY "Qualquer um pode ver o conteúdo do site"
ON public.site_content FOR SELECT
TO anon, authenticated
USING (true);

-- 2. Somente Administradores podem EDITAR o conteúdo
DROP POLICY IF EXISTS "Somente admins podem editar o conteúdo" ON public.site_content;
CREATE POLICY "Somente admins podem editar o conteúdo"
ON public.site_content FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

-- Inserir o registro inicial caso não exista (baseado no seu content.json)
-- Nota: O sistema fará o primeiro 'upsert' automaticamente ao salvar pela primeira vez.

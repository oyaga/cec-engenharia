-- ============================================================
-- TABELA DE OUVIDORIA (complaints)
-- Armazena reclamações e sugestões enviadas pelo site
-- ============================================================

CREATE TABLE IF NOT EXISTS public.complaints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT DEFAULT 'Anônimo',
  phone TEXT DEFAULT 'Não informado',
  description TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_review', 'resolved')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;

-- Qualquer pessoa pode INSERIR (enviar uma reclamação)
DROP POLICY IF EXISTS "Qualquer um pode inserir reclamação" ON public.complaints;
CREATE POLICY "Qualquer um pode inserir reclamação"
ON public.complaints FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Somente usuários autenticados (admin/secretaria) podem VER as reclamações
DROP POLICY IF EXISTS "Admins podem ver reclamações" ON public.complaints;
CREATE POLICY "Admins podem ver reclamações"
ON public.complaints FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role IN ('admin', 'coordenador', 'atendente')
  )
);

-- Somente admins podem atualizar o status
DROP POLICY IF EXISTS "Admins podem atualizar reclamações" ON public.complaints;
CREATE POLICY "Admins podem atualizar reclamações"
ON public.complaints FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role IN ('admin', 'coordenador')
  )
);

NOTIFY pgrst, 'reload schema';

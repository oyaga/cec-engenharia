-- Remove políticas anteriores se existirem
DROP POLICY IF EXISTS "Public lead update" ON public.leads;
DROP POLICY IF EXISTS "Public lead select" ON public.leads;

-- Cria políticas públicas de SELECT e UPDATE para o papel anônimo (anon) na tabela de leads.
-- Isso é necessário caso a Maria Antônia utilize a chave anônima (anon key) do site para salvar leads com UPSERT.
CREATE POLICY "Public lead update" ON public.leads FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Public lead select" ON public.leads FOR SELECT TO anon USING (true);

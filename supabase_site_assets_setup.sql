-- BUCKET PARA ASSETS DO SITE (IMAGENS E VÍDEOS)
-- 1. Criar o bucket 'site_assets' se não existir
INSERT INTO storage.buckets (id, name, public) 
VALUES ('site_assets', 'site_assets', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Políticas de Segurança (Storage RLS)

-- Permitir leitura pública de todas as imagens/vídeos do site
DROP POLICY IF EXISTS "Site Assets Publicos" ON storage.objects;
CREATE POLICY "Site Assets Publicos"
ON storage.objects FOR SELECT
USING (bucket_id = 'site_assets');

-- Permitir que qualquer usuário autenticado (Equipe) faça upload
-- Já que usamos o sistema de permissões interno, qualquer logado na equipe pode subir
DROP POLICY IF EXISTS "Equipe pode subir assets" ON storage.objects;
CREATE POLICY "Equipe pode subir assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'site_assets');

-- Permitir exclusão apenas para admins e quem tem permissão de site_edit
DROP POLICY IF EXISTS "Admins podem excluir assets" ON storage.objects;
CREATE POLICY "Admins podem excluir assets"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'site_assets' AND
    (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND (users.role = 'admin' OR (users.permissions->>'edit_site')::boolean = true)))
);

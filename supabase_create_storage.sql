-- Script para criar o bucket "site_assets" e liberar o acesso público

-- 1. Inserir o bucket na tabela de buckets do storage, caso não exista
INSERT INTO storage.buckets (id, name, public)
VALUES ('site_assets', 'site_assets', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Permitir que qualquer pessoa leia as imagens (Acesso Público)
CREATE POLICY "Imagens públicas para visualização" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'site_assets');

-- 3. Permitir que usuários autenticados (ou webdesigners) façam upload
CREATE POLICY "Upload permitido para autenticados" 
ON storage.objects FOR INSERT 
WITH CHECK (
    bucket_id = 'site_assets' 
    AND auth.role() = 'authenticated'
);

-- 4. Permitir deleção/edição para usuários autenticados
CREATE POLICY "Deleção permitida para autenticados" 
ON storage.objects FOR DELETE 
USING (
    bucket_id = 'site_assets' 
    AND auth.role() = 'authenticated'
);

CREATE POLICY "Atualização permitida para autenticados" 
ON storage.objects FOR UPDATE 
USING (
    bucket_id = 'site_assets' 
    AND auth.role() = 'authenticated'
);

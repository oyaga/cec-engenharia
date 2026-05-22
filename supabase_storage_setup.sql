-- SUPORTE A DOCUMENTOS NO LMS (PDF, Word, Excel, PPT)
-- 1. Criar o bucket 'lms-docs' para documentos das aulas
INSERT INTO storage.buckets (id, name, public) 
VALUES ('lms-docs', 'lms-docs', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Políticas de Segurança (Storage RLS)

-- Permitir leitura pública dos documentos
DROP POLICY IF EXISTS "Documentos LMS Publicos" ON storage.objects;
CREATE POLICY "Documentos LMS Publicos"
ON storage.objects FOR SELECT
USING (bucket_id = 'lms-docs');

-- Permitir que administradores e coordenadores façam upload
DROP POLICY IF EXISTS "Admins podem subir documentos LMS" ON storage.objects;
CREATE POLICY "Admins podem subir documentos LMS"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'lms-docs' AND
    (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND (users.role = 'admin' OR users.role = 'coordenador')))
);

-- Permitir que administradores e coordenadores excluam arquivos
DROP POLICY IF EXISTS "Admins podem excluir documentos LMS" ON storage.objects;
CREATE POLICY "Admins podem excluir documentos LMS"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'lms-docs' AND
    (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND (users.role = 'admin' OR users.role = 'coordenador')))
);

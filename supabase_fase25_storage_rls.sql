-- MIGRACAO DE PERMISSAO DE STORAGE PARA CARGO ADMINISTRATIVO
-- Permite que o cargo 'administrativo' (como o Carlos) faça upload e exclusão de PDFs/documentos das videoaulas no bucket 'lms-docs'

-- 1. Atualizar a política de INSERT (Upload)
DROP POLICY IF EXISTS "Admins podem subir documentos LMS" ON storage.objects;
CREATE POLICY "Admins podem subir documentos LMS"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'lms-docs' AND
    (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND (users.role = 'admin' OR users.role = 'coordenador' OR users.role = 'administrativo')))
);

-- 2. Atualizar a política de DELETE (Exclusão)
DROP POLICY IF EXISTS "Admins podem excluir documentos LMS" ON storage.objects;
CREATE POLICY "Admins podem excluir documentos LMS"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'lms-docs' AND
    (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND (users.role = 'admin' OR users.role = 'coordenador' OR users.role = 'administrativo')))
);

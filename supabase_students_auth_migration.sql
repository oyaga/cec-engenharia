-- Adiciona a role 'aluno' aos usuários
ALTER TABLE public.users DROP CONSTRAINT users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'coordenador', 'atendente', 'instrutor', 'aluno'));

-- Cria relacionamento dos alunos com os usuários de auth
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS requires_password_change BOOLEAN DEFAULT true;

-- Criação do Bucket de Documentos dos Alunos (se não existir)
INSERT INTO storage.buckets (id, name, public) VALUES ('student_documents', 'student_documents', false) ON CONFLICT DO NOTHING;

-- RLS (Segurança) do Bucket: Aluno pode ver e inserir os próprios docs, Admins podem tudo
CREATE POLICY "Alunos podem ver seus proprios documentos" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'student_documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Alunos podem inserir seus proprios documentos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'student_documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Admins podem ver todos os documentos" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'student_documents' AND EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'coordenador', 'atendente')));

-- ADICIONA COLUNAS DE DOCUMENTOS NA TABELA DE ALUNOS
ALTER TABLE public.students
ADD COLUMN IF NOT EXISTS doc_photo_url TEXT,
ADD COLUMN IF NOT EXISTS doc_id_url TEXT,
ADD COLUMN IF NOT EXISTS doc_cpf_url TEXT,
ADD COLUMN IF NOT EXISTS doc_education_url TEXT,
ADD COLUMN IF NOT EXISTS doc_address_url TEXT,
ADD COLUMN IF NOT EXISTS doc_exams_url JSONB DEFAULT '[]';

-- ADICIONA COLUNA DE AVALIAÇÃO NA TABELA DE TURMAS
ALTER TABLE public.classes
ADD COLUMN IF NOT EXISTS evaluation_pdf_url TEXT;

-- CONFIGURAÇÃO DE BUCKETS (STORAGE)
-- Nota: O Supabase não permite criar buckets via SQL standard facilmente sem extensões,
-- mas podemos garantir que a lógica de permissões esteja pronta. 
-- Idealmente o usuário cria os buckets "student-docs" e "class-evaluations" no painel.

-- PERMISSÕES DE STORAGE (RLS)
-- Permitir que usuários autenticados façam upload e leitura (ajuste conforme necessidade de privacidade)
DO $$
BEGIN
    INSERT INTO storage.buckets (id, name, public) 
    VALUES ('student-docs', 'student-docs', true)
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO storage.buckets (id, name, public) 
    VALUES ('class-evaluations', 'class-evaluations', true)
    ON CONFLICT (id) DO NOTHING;
END $$;

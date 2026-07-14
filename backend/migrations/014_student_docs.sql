-- Documentos do aluno (Área do Aluno / conformidade Abendi).
ALTER TABLE students ADD COLUMN IF NOT EXISTS doc_photo_url     TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS doc_id_url        TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS doc_cpf_url       TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS doc_address_url   TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS doc_education_url TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS progress_percent  INTEGER DEFAULT 0;
ALTER TABLE students ADD COLUMN IF NOT EXISTS terms_accepted    BOOLEAN DEFAULT FALSE;

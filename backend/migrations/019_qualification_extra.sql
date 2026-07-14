-- Campos de comprovação usados pelo assistente PR-127 (tela Instrutores).
ALTER TABLE instructor_qualifications ADD COLUMN IF NOT EXISTS qualification_type TEXT;
ALTER TABLE instructor_qualifications ADD COLUMN IF NOT EXISTS snqc_url           TEXT;
ALTER TABLE instructor_qualifications ADD COLUMN IF NOT EXISTS experience_url     TEXT;

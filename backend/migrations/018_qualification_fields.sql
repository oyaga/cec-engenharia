-- Campos do assistente PR-127 e do fluxo de aprovação de qualificações.
ALTER TABLE instructor_qualifications ADD COLUMN IF NOT EXISTS training_url     TEXT;
ALTER TABLE instructor_qualifications ADD COLUMN IF NOT EXISTS training_hours   INTEGER;
ALTER TABLE instructor_qualifications ADD COLUMN IF NOT EXISTS training_date    DATE;
ALTER TABLE instructor_qualifications ADD COLUMN IF NOT EXISTS diploma_url      TEXT;
ALTER TABLE instructor_qualifications ADD COLUMN IF NOT EXISTS rg_url           TEXT;
ALTER TABLE instructor_qualifications ADD COLUMN IF NOT EXISTS cpf_doc_url      TEXT;
ALTER TABLE instructor_qualifications ADD COLUMN IF NOT EXISTS photo_url        TEXT;
ALTER TABLE instructor_qualifications ADD COLUMN IF NOT EXISTS approved_at      TIMESTAMPTZ;
ALTER TABLE instructor_qualifications ADD COLUMN IF NOT EXISTS valid_until      DATE;
ALTER TABLE instructor_qualifications ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

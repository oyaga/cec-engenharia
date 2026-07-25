-- Status de revisão por documento: pending | approved | rejected
-- Quando o aluno envia um arquivo novo, o frontend reseta o status para pending.
ALTER TABLE students ADD COLUMN IF NOT EXISTS doc_photo_status     TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE students ADD COLUMN IF NOT EXISTS doc_id_status        TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE students ADD COLUMN IF NOT EXISTS doc_cpf_status       TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE students ADD COLUMN IF NOT EXISTS doc_address_status   TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE students ADD COLUMN IF NOT EXISTS doc_education_status TEXT NOT NULL DEFAULT 'pending';

-- Motivo de rejeição (preenchido pela secretaria ao rejeitar; NULL ao aprovar)
ALTER TABLE students ADD COLUMN IF NOT EXISTS doc_photo_reject     TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS doc_id_reject        TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS doc_cpf_reject       TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS doc_address_reject   TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS doc_education_reject TEXT;

-- Dados estruturados do fluxo Curso -> Turma.
ALTER TABLE classes ADD COLUMN IF NOT EXISTS has_in_person          BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS in_person_sessions     INTEGER NOT NULL DEFAULT 0;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS cep                    TEXT;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS address_number         TEXT;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS address_complement     TEXT;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS card_installments      INTEGER NOT NULL DEFAULT 10;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS boleto_installments    INTEGER NOT NULL DEFAULT 1;

ALTER TABLE classes DROP CONSTRAINT IF EXISTS classes_in_person_sessions_check;
ALTER TABLE classes ADD CONSTRAINT classes_in_person_sessions_check CHECK (in_person_sessions >= 0);
ALTER TABLE classes DROP CONSTRAINT IF EXISTS classes_card_installments_check;
ALTER TABLE classes ADD CONSTRAINT classes_card_installments_check CHECK (card_installments BETWEEN 1 AND 24);
ALTER TABLE classes DROP CONSTRAINT IF EXISTS classes_boleto_installments_check;
ALTER TABLE classes ADD CONSTRAINT classes_boleto_installments_check CHECK (boleto_installments BETWEEN 1 AND 24);

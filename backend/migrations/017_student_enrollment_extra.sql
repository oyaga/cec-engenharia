-- Campos extras de matrícula/cancelamento usados pela tela Alunos.
ALTER TABLE students ADD COLUMN IF NOT EXISTS how_knew            TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS how_knew_other      TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS cancellation_date   DATE;
ALTER TABLE students ADD COLUMN IF NOT EXISTS refund_value        NUMERIC;
ALTER TABLE students ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS cancellation_note   TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS doc_exams_url       JSONB;
ALTER TABLE students ADD COLUMN IF NOT EXISTS asaas_customer_id   TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS asaas_payment_id    TEXT;

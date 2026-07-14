-- Campos de pagamento da matrícula (usados pela tela Matriculas).
ALTER TABLE students ADD COLUMN IF NOT EXISTS base_value     NUMERIC DEFAULT 0;
ALTER TABLE students ADD COLUMN IF NOT EXISTS discount_value NUMERIC DEFAULT 0;
ALTER TABLE students ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pendente';
ALTER TABLE classes  ADD COLUMN IF NOT EXISTS course_value   NUMERIC;

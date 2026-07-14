-- Campos de lançamento de nota usados pela tela Alunos.
ALTER TABLE student_evaluations ADD COLUMN IF NOT EXISTS exam_type        TEXT;
ALTER TABLE student_evaluations ADD COLUMN IF NOT EXISTS attempt          INTEGER DEFAULT 1;
ALTER TABLE student_evaluations ADD COLUMN IF NOT EXISTS grade            NUMERIC;
ALTER TABLE student_evaluations ADD COLUMN IF NOT EXISTS retraining_hours INTEGER DEFAULT 0;
ALTER TABLE student_evaluations ADD COLUMN IF NOT EXISTS date             DATE;

-- Campos usados pelo painel do Professor (status/diário de turma e chamada).
ALTER TABLE classes ADD COLUMN IF NOT EXISTS status TEXT;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS notes  TEXT;

ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS justification_type TEXT;
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS justification_note TEXT;
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS content_taught     TEXT;
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS class_notes        TEXT;
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS recorded_by        UUID;

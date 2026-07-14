-- Colunas extras de lms_lessons usadas pelo LMSAdmin/LessonPlayer.
ALTER TABLE lms_lessons ADD COLUMN IF NOT EXISTS pdf_url        TEXT;
ALTER TABLE lms_lessons ADD COLUMN IF NOT EXISTS allow_download BOOLEAN DEFAULT FALSE;
ALTER TABLE lms_lessons ADD COLUMN IF NOT EXISTS type           TEXT;

-- Módulos presenciais, autorizações do professor e chamada compartilhada.

ALTER TABLE lms_modules ADD COLUMN IF NOT EXISTS is_in_person BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE lms_modules ADD COLUMN IF NOT EXISTS in_person_date DATE;
ALTER TABLE lms_modules ADD COLUMN IF NOT EXISTS start_time TIME;
ALTER TABLE lms_modules ADD COLUMN IF NOT EXISTS end_time TIME;
ALTER TABLE lms_modules ADD COLUMN IF NOT EXISTS cep TEXT;
ALTER TABLE lms_modules ADD COLUMN IF NOT EXISTS street TEXT;
ALTER TABLE lms_modules ADD COLUMN IF NOT EXISTS address_number TEXT;
ALTER TABLE lms_modules ADD COLUMN IF NOT EXISTS address_complement TEXT;
ALTER TABLE lms_modules ADD COLUMN IF NOT EXISTS neighborhood TEXT;
ALTER TABLE lms_modules ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE lms_modules ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE lms_modules ADD COLUMN IF NOT EXISTS latitude NUMERIC(10,7);
ALTER TABLE lms_modules ADD COLUMN IF NOT EXISTS longitude NUMERIC(10,7);
ALTER TABLE lms_modules ADD COLUMN IF NOT EXISTS whatsapp_url TEXT;
ALTER TABLE lms_modules ADD COLUMN IF NOT EXISTS attendance_open_at TIMESTAMPTZ;
ALTER TABLE lms_modules ADD COLUMN IF NOT EXISTS attendance_close_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS instructor_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instructor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT instructor_categories_unique UNIQUE (instructor_id, category)
);

CREATE TABLE IF NOT EXISTS instructor_courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instructor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES lms_courses(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT instructor_courses_unique UNIQUE (instructor_id, course_id)
);

ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS module_id UUID REFERENCES lms_modules(id) ON DELETE CASCADE;
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS student_confirmed_at TIMESTAMPTZ;
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS professor_confirmed_at TIMESTAMPTZ;
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Remove duplicatas históricas antes de garantir uma chamada única por aluno/módulo/turma.
DELETE FROM attendance_records a
USING attendance_records b
WHERE a.id < b.id
  AND a.class_id = b.class_id
  AND a.student_id = b.student_id
  AND a.module_id IS NOT DISTINCT FROM b.module_id
  AND a.date = b.date;

CREATE UNIQUE INDEX IF NOT EXISTS attendance_class_student_module_date_uidx
ON attendance_records (class_id, student_id, module_id, date);
CREATE INDEX IF NOT EXISTS instructor_courses_instructor_idx ON instructor_courses (instructor_id);
CREATE INDEX IF NOT EXISTS attendance_module_idx ON attendance_records (module_id);


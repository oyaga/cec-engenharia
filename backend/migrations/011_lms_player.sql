-- =====================================================================
-- Migration 011 — Suporte ao player de aula (LessonPlayer):
-- entrega de tarefas, registro de tempo de estudo e confirmação de
-- presença pelo aluno.
-- =====================================================================

CREATE TABLE IF NOT EXISTS task_submissions (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id   UUID REFERENCES users(id) ON DELETE CASCADE,
    lesson_id    UUID REFERENCES lms_lessons(id) ON DELETE CASCADE,
    file_url     TEXT,
    status       TEXT DEFAULT 'enviado',
    feedback     TEXT,
    grade        NUMERIC,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (student_id, lesson_id)
);

CREATE TABLE IF NOT EXISTS lms_time_logs (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id       UUID REFERENCES users(id) ON DELETE CASCADE,
    course_id        UUID,
    quiz_id          UUID,
    lesson_id        UUID,
    duration_seconds INTEGER NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS lms_time_logs_student_idx ON lms_time_logs (student_id);

ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS confirmed_by_student BOOLEAN DEFAULT FALSE;

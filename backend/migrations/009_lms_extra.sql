-- =====================================================================
-- Migration 009 — Completa o LMS: avisos, banco de questões, questões de
-- aula (inline) e colunas extras de quizzes/questões usadas pelas telas.
-- =====================================================================

CREATE TABLE IF NOT EXISTS lms_announcements (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title      TEXT NOT NULL,
    content    TEXT NOT NULL,
    priority   TEXT NOT NULL DEFAULT 'geral',   -- urgente | importante | geral
    course_id  UUID REFERENCES lms_courses(id) ON DELETE CASCADE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS lms_announcements_course_idx ON lms_announcements (course_id);

CREATE TABLE IF NOT EXISTS lms_question_bank (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_text        TEXT,
    image_url            TEXT,
    options              JSONB NOT NULL,
    correct_option_index INTEGER NOT NULL,
    category             TEXT,
    difficulty           TEXT DEFAULT 'medium',
    original_quiz_id     UUID REFERENCES lms_quizzes(id) ON DELETE SET NULL,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS lms_qbank_category_idx ON lms_question_bank (category);

-- Dúvidas dos alunos por aula (Central de Dúvidas do LMS).
CREATE TABLE IF NOT EXISTS lms_lesson_questions (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id     UUID REFERENCES lms_lessons(id) ON DELETE CASCADE,
    student_id    UUID REFERENCES users(id) ON DELETE SET NULL,
    question_text TEXT NOT NULL,
    answer_text   TEXT,
    answered_by   UUID REFERENCES users(id) ON DELETE SET NULL,
    answered_at   TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS lms_lesson_q_lesson_idx ON lms_lesson_questions (lesson_id);

-- Colunas extras usadas pelas telas de prova.
ALTER TABLE lms_quizzes   ADD COLUMN IF NOT EXISTS quiz_type         TEXT DEFAULT 'exercise';
ALTER TABLE lms_quizzes   ADD COLUMN IF NOT EXISTS time_limit_minutes INTEGER DEFAULT 0;
ALTER TABLE lms_questions ADD COLUMN IF NOT EXISTS image_url         TEXT;

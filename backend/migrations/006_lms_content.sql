-- =====================================================================
-- Migration 006 — Conteúdo LMS: módulos, aulas, progresso, quizzes,
-- questões, resultados, fórum e certificados.
-- student_id referencia users(id) (antes era auth.users no Supabase).
-- =====================================================================

CREATE TABLE IF NOT EXISTS lms_modules (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id   UUID REFERENCES lms_courses(id) ON DELETE CASCADE,
    title       TEXT NOT NULL,
    order_index INT DEFAULT 0
);
CREATE INDEX IF NOT EXISTS lms_modules_course_idx ON lms_modules (course_id);

CREATE TABLE IF NOT EXISTS lms_lessons (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id          UUID REFERENCES lms_modules(id) ON DELETE CASCADE,
    title              TEXT NOT NULL,
    video_url          TEXT,
    content_text       TEXT,
    min_watch_time_sec INT DEFAULT 0,
    order_index        INT DEFAULT 0
);
CREATE INDEX IF NOT EXISTS lms_lessons_module_idx ON lms_lessons (module_id);

CREATE TABLE IF NOT EXISTS lms_student_progress (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id      UUID REFERENCES users(id) ON DELETE CASCADE,
    lesson_id       UUID REFERENCES lms_lessons(id) ON DELETE CASCADE,
    watched_seconds INT DEFAULT 0,
    is_completed    BOOLEAN DEFAULT FALSE,
    last_accessed   TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (student_id, lesson_id)
);

CREATE TABLE IF NOT EXISTS lms_quizzes (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id     UUID REFERENCES lms_courses(id) ON DELETE CASCADE,
    module_id     UUID REFERENCES lms_modules(id) ON DELETE SET NULL,
    title         TEXT NOT NULL,
    passing_grade INT DEFAULT 70,
    max_attempts  INT DEFAULT 3,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lms_questions (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id              UUID REFERENCES lms_quizzes(id) ON DELETE CASCADE,
    question_text        TEXT NOT NULL,
    options              JSONB NOT NULL,
    correct_option_index INT NOT NULL
);

CREATE TABLE IF NOT EXISTS lms_quiz_results (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id     UUID REFERENCES users(id) ON DELETE CASCADE,
    quiz_id        UUID REFERENCES lms_quizzes(id) ON DELETE CASCADE,
    score          INT NOT NULL,
    attempts_count INT DEFAULT 1,
    is_approved    BOOLEAN DEFAULT FALSE,
    completed_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lms_forum_topics (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id  UUID REFERENCES lms_lessons(id) ON DELETE CASCADE,
    student_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title      TEXT NOT NULL,
    content    TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lms_forum_replies (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    topic_id   UUID REFERENCES lms_forum_topics(id) ON DELETE CASCADE,
    author_id  UUID REFERENCES users(id) ON DELETE CASCADE,
    content    TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lms_certificate_configs (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id    UUID REFERENCES lms_courses(id) ON DELETE CASCADE,
    template     JSONB,
    signature_url TEXT,
    is_active    BOOLEAN DEFAULT TRUE,
    created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lms_issued_certificates (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id     UUID REFERENCES users(id) ON DELETE CASCADE,
    course_id      UUID REFERENCES lms_courses(id) ON DELETE SET NULL,
    code           TEXT UNIQUE NOT NULL,
    issued_at      TIMESTAMPTZ DEFAULT NOW(),
    metadata       JSONB
);
CREATE INDEX IF NOT EXISTS lms_issued_cert_code_idx ON lms_issued_certificates (code);

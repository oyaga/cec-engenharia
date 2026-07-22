-- Avaliacoes por aula e sorteio seguro de questoes por tentativa.
ALTER TABLE lms_quizzes ADD COLUMN IF NOT EXISTS lesson_id UUID REFERENCES lms_lessons(id) ON DELETE CASCADE;
ALTER TABLE lms_quizzes ADD COLUMN IF NOT EXISTS questions_per_attempt INTEGER NOT NULL DEFAULT 0;
ALTER TABLE lms_quizzes ADD COLUMN IF NOT EXISTS randomize_questions BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE lms_quizzes ADD COLUMN IF NOT EXISTS reveal_answers BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE lms_questions ADD COLUMN IF NOT EXISTS explanation TEXT;

CREATE INDEX IF NOT EXISTS lms_quizzes_lesson_idx ON lms_quizzes (lesson_id);
CREATE UNIQUE INDEX IF NOT EXISTS lms_one_exercise_per_lesson_idx
    ON lms_quizzes (lesson_id)
    WHERE quiz_type = 'exercise' AND lesson_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS lms_quiz_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    quiz_id UUID NOT NULL REFERENCES lms_quizzes(id) ON DELETE CASCADE,
    question_ids JSONB NOT NULL,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS lms_quiz_attempts_student_quiz_idx
    ON lms_quiz_attempts (student_id, quiz_id, started_at DESC);

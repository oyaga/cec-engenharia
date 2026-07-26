-- =====================================================================
-- Migration 003 — Acadêmico: classes (turmas), vínculo de instrutores,
-- presença, registros acadêmicos, avaliações e habilitação PR-127.
-- Estende students com os campos usados pela gestão de turmas.
-- =====================================================================

-- ─── classes (turmas) ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS classes (
    id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                      TEXT NOT NULL,
    course_name               TEXT NOT NULL,
    start_date                DATE,
    predicted_end_date        DATE,
    actual_start_date         DATE,
    actual_end_date           DATE,
    schedule                  TEXT,
    duration                  TEXT,
    lms_course_id             UUID,   -- FK lógica p/ lms_courses (migration LMS)
    evaluation_pdf_url        TEXT,
    price_cash                NUMERIC(10,2) DEFAULT 0,
    price_card_10x            NUMERIC(10,2) DEFAULT 0,
    price_installments_3x     NUMERIC(10,2) DEFAULT 0,
    is_immediate_start        BOOLEAN NOT NULL DEFAULT FALSE,
    instructor_payment_type   TEXT DEFAULT 'fixed',
    instructor_payment_value  NUMERIC(10,2) DEFAULT 0,
    address                   TEXT,
    max_capacity              INTEGER NOT NULL DEFAULT 10,
    created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── students: colunas usadas na gestão de turmas/prática/EAD ─────────
ALTER TABLE students ADD COLUMN IF NOT EXISTS status                  TEXT DEFAULT 'ativa';
ALTER TABLE students ADD COLUMN IF NOT EXISTS practical_class_id      UUID REFERENCES classes(id) ON DELETE SET NULL;
ALTER TABLE students ADD COLUMN IF NOT EXISTS practical_class_status  TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS has_lms_access          BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE students ADD COLUMN IF NOT EXISTS manual_signed           BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE students ADD COLUMN IF NOT EXISTS is_online_only          BOOLEAN NOT NULL DEFAULT FALSE;
-- FK de turma_id (criada nula em 001) agora que classes existe.
DO $$ BEGIN
  ALTER TABLE students ADD CONSTRAINT students_turma_fk
    FOREIGN KEY (turma_id) REFERENCES classes(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS students_turma_idx ON students (turma_id);
CREATE INDEX IF NOT EXISTS students_practical_idx ON students (practical_class_id);

-- ─── class_instructors (vínculo turma↔instrutor) ─────────────────────
CREATE TABLE IF NOT EXISTS class_instructors (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id   UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role       TEXT NOT NULL DEFAULT 'titular',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT class_instructors_unique UNIQUE (class_id, user_id)
);

-- ─── attendance_records (presença) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS attendance_records (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id   UUID REFERENCES classes(id) ON DELETE CASCADE,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    date       DATE NOT NULL,
    status     TEXT NOT NULL CHECK (status IN ('presente', 'ausente', 'justificado')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── academic_records (situação/notas do aluno) ──────────────────────
CREATE TABLE IF NOT EXISTS academic_records (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id        UUID REFERENCES students(id) ON DELETE CASCADE,
    status            TEXT DEFAULT 'Ativo',
    theoretical_grade NUMERIC,
    practical_grade   NUMERIC,
    final_status      TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── student_evaluations (A1: notas — agora protegida por RBAC) ──────
CREATE TABLE IF NOT EXISTS student_evaluations (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id        UUID REFERENCES students(id) ON DELETE CASCADE,
    class_id          UUID REFERENCES classes(id) ON DELETE SET NULL,
    evaluator_id      UUID REFERENCES users(id) ON DELETE SET NULL,
    theoretical_grade NUMERIC,
    practical_grade   NUMERIC,
    final_status      TEXT,
    notes             TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── instructor_qualifications (habilitação PR-127) ──────────────────
CREATE TABLE IF NOT EXISTS instructor_qualifications (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    method       TEXT NOT NULL,        -- CD-MC | CD-CL | CD-TO
    status       TEXT NOT NULL DEFAULT 'pendente',  -- pendente | ativo | rejeitado
    details      JSONB,                -- dados do assistente PR-127 (comprovações, arquivos)
    approved_by  UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS instr_qual_user_idx ON instructor_qualifications (user_id);

DO $$ BEGIN
  CREATE TRIGGER classes_set_updated_at BEFORE UPDATE ON classes FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER instr_qual_set_updated_at BEFORE UPDATE ON instructor_qualifications FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =====================================================================
-- Migration 005 — Catálogo de cursos LMS (lms_courses).
-- Início do domínio LMS: a tabela de cursos com preços, que destrava
-- pricing em Turmas, Matrícula, Financeiro e a página pública de Cursos.
-- (Módulos/aulas/quizzes/certificados virão em migrations LMS seguintes.)
-- =====================================================================

CREATE TABLE IF NOT EXISTS lms_courses (
    id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title                    TEXT NOT NULL,
    code                     TEXT,
    description              TEXT,
    thumbnail_url            TEXT,
    is_published             BOOLEAN NOT NULL DEFAULT FALSE,
    -- Preços por forma de pagamento
    price_pix                NUMERIC(10,2),
    price_card               NUMERIC(10,2),
    price_boleto             NUMERIC(10,2),
    price_financing          NUMERIC(10,2),
    default_value            NUMERIC(10,2),
    max_installments         INTEGER DEFAULT 10,
    financing_installments   INTEGER DEFAULT 6,
    min_theoretical_hours    INTEGER,
    asaas_payment_link       TEXT,
    instructor_payment_type  TEXT DEFAULT 'fixed',
    instructor_payment_value NUMERIC(10,2) DEFAULT 0,
    created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS lms_courses_published_idx ON lms_courses (is_published);

DO $$ BEGIN
  CREATE TRIGGER lms_courses_set_updated_at BEFORE UPDATE ON lms_courses FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

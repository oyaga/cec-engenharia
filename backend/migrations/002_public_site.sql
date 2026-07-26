-- =====================================================================
-- Migration 002 — Site público: leads, complaints (Ouvidoria),
-- testimonials (depoimentos), enrollments (pré-matrícula pelo site).
-- Consolida full_features_setup.sql + supabase_complaints.sql +
-- testimonials_setup.sql num schema único.
-- =====================================================================

-- ─── leads (captação do site / chatbot) ──────────────────────────────
-- CORREÇÃO C5: antes anon lia e ALTERAVA toda a base. Agora leads só
-- existem atrás da API Go: captação é POST público (server-side), e a
-- leitura/gestão exige JWT + papel (admin/coordenador/atendente).
CREATE TABLE IF NOT EXISTS leads (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT NOT NULL,
    phone           TEXT NOT NULL,
    email           TEXT,
    course_interest TEXT,
    message         TEXT,
    interesse       TEXT,
    origem          TEXT DEFAULT 'site',
    status          TEXT NOT NULL DEFAULT 'novo' CHECK (status IN ('novo', 'em_atendimento', 'concluido')),
    observacao      TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Índice para o "upsert por telefone" da captação (só telefones não-vazios).
CREATE UNIQUE INDEX IF NOT EXISTS leads_phone_uidx ON leads (phone) WHERE phone <> '';

-- ─── complaints (Ouvidoria) ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS complaints (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name         TEXT DEFAULT 'Anônimo',
    phone        TEXT DEFAULT 'Não informado',
    description  TEXT NOT NULL,
    status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_review', 'resolved')),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── testimonials (depoimentos) ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS testimonials (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name              TEXT NOT NULL,
    course            TEXT NOT NULL,
    evaluation_date   DATE DEFAULT CURRENT_DATE,
    content           TEXT,
    image_url         TEXT,
    status            TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('approved', 'pending', 'rejected')),
    type              TEXT NOT NULL DEFAULT 'text' CHECK (type IN ('text', 'screenshot')),
    rating            INTEGER NOT NULL DEFAULT 5 CHECK (rating BETWEEN 1 AND 5),
    admin_description TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── enrollments (pré-matrícula pelo site público) ───────────────────
CREATE TABLE IF NOT EXISTS enrollments (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name         TEXT NOT NULL,
    phone        TEXT NOT NULL,
    email        TEXT,
    course_name  TEXT NOT NULL,
    status       TEXT NOT NULL DEFAULT 'pending',
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$ BEGIN
  CREATE TRIGGER leads_set_updated_at BEFORE UPDATE ON leads FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

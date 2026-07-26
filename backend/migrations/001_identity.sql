-- =====================================================================
-- Migration 001 — Identidade (schema canônico)
-- Consolida users/students/staff/financial_pins/audit_logs a partir dos
-- 60+ scripts .sql soltos do projeto Supabase, agora SEM dependência do
-- schema `auth` do Supabase (users passa a ser self-contained).
-- =====================================================================

-- Papéis do sistema (bate com o código legado: is_staff, redirects de Login,
-- e 'webdesigner' = editor do site usado em AdminUsers).
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('admin', 'coordenador', 'atendente', 'instrutor', 'aluno', 'webdesigner');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── users ───────────────────────────────────────────────────────────
-- Antes: id UUID REFERENCES auth.users(id) + senha no GoTrue do Supabase.
-- Agora: self-contained com password_hash (bcrypt gerado pelo backend Go).
CREATE TABLE IF NOT EXISTS users (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email                 TEXT NOT NULL,
    password_hash         TEXT NOT NULL,
    full_name             TEXT NOT NULL,
    role                  user_role NOT NULL DEFAULT 'aluno',
    cpf                   TEXT,
    phone                 TEXT,
    address               JSONB,
    birth_date            DATE,
    admission_date        DATE,
    bio                   TEXT,
    avatar_url            TEXT,
    permissions           JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_active             BOOLEAN NOT NULL DEFAULT TRUE,
    must_change_password  BOOLEAN NOT NULL DEFAULT FALSE,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- E-mail único, case-insensitive (o app normaliza para minúsculas ao gravar/logar).
CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_uidx ON users (LOWER(email));

-- ─── students (perfil estendido do aluno) ────────────────────────────
-- Ligado a users por user_id (aluno com login). Mantido separado porque
-- guarda dados acadêmicos/matrícula que não pertencem à identidade.
CREATE TABLE IF NOT EXISTS students (
    id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                   UUID REFERENCES users(id) ON DELETE SET NULL,
    matricula_numero          BIGSERIAL,
    turma_id                  UUID,  -- FK para classes (migration de acadêmico, Fase 2)
    full_name                 TEXT NOT NULL,
    cpf                       TEXT UNIQUE NOT NULL,
    rg                        TEXT,
    birth_date                DATE,
    birth_place               TEXT,
    marital_status            TEXT,
    email                     TEXT,
    phone                     TEXT,
    education_level           TEXT,
    parents_names             JSONB,
    address                   JSONB,
    requires_password_change  BOOLEAN NOT NULL DEFAULT FALSE,
    created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS students_user_id_idx ON students (user_id);

-- ─── staff (equipe interna) ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS staff (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID REFERENCES users(id) ON DELETE SET NULL,
    name                TEXT NOT NULL,
    cpf                 TEXT UNIQUE,
    role                TEXT NOT NULL,
    email               TEXT,
    phone               TEXT,
    admission_date      DATE,
    salary              NUMERIC(10,2),
    has_platform_access BOOLEAN NOT NULL DEFAULT FALSE,
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── financial_pins ──────────────────────────────────────────────────
-- CORREÇÃO C4: antes semeava PIN '123456' e era legível por anon.
-- Agora guarda HASH do PIN; validação é server-side; sem seed de PIN default.
CREATE TABLE IF NOT EXISTS financial_pins (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pin_hash    TEXT NOT NULL,
    role        TEXT NOT NULL DEFAULT 'admin',
    created_by  UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── audit_logs ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID REFERENCES users(id) ON DELETE SET NULL,
    action       TEXT NOT NULL,
    entity_type  TEXT NOT NULL,
    entity_id    UUID,
    details      JSONB,
    ip           TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS audit_logs_user_id_idx ON audit_logs (user_id);
CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx ON audit_logs (created_at DESC);

-- gatilho simples para manter updated_at
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER users_set_updated_at    BEFORE UPDATE ON users    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER students_set_updated_at BEFORE UPDATE ON students FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER staff_set_updated_at    BEFORE UPDATE ON staff    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

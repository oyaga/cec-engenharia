-- =====================================================================
-- Migration 004 — Financeiro + Configurações do sistema.
-- system_settings (guarda a chave Asaas — agora só acessível por admin via
-- API, fechando C1) + financeiro (records, costs, expenses, invoices,
-- onboarding_logs).
-- =====================================================================

-- ─── system_settings ─────────────────────────────────────────────────
-- CORREÇÃO C1: antes tinha policy anon SELECT USING(true) e guardava a
-- asaas_api_key. Agora só a API Go (RBAC admin) lê/escreve; segredos
-- sensíveis nunca são devolvidos ao browser (ver settings handler).
CREATE TABLE IF NOT EXISTS system_settings (
    key         TEXT PRIMARY KEY,
    value       TEXT,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── financial_records ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS financial_records (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id       UUID REFERENCES students(id) ON DELETE CASCADE,
    course_id        UUID,
    total_value      NUMERIC(10,2),
    amount           NUMERIC(10,2),
    payment_method   TEXT,
    installments     JSONB,
    type             TEXT DEFAULT 'receita' CHECK (type IN ('receita', 'despesa')),
    category         TEXT DEFAULT 'matricula',
    status           TEXT DEFAULT 'pendente',
    description      TEXT,
    asaas_payment_id TEXT,
    date             TIMESTAMPTZ DEFAULT NOW(),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS financial_records_student_idx ON financial_records (student_id);

-- ─── financial_costs ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS financial_costs (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id     UUID REFERENCES classes(id) ON DELETE CASCADE,
    description  TEXT NOT NULL,
    type         TEXT NOT NULL CHECK (type IN ('fixed', 'percentage', 'profit_split_50_50')),
    value        NUMERIC(10,2) NOT NULL,
    amount       NUMERIC(10,2) NOT NULL,
    status       TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago')),
    date_incurred DATE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── expenses (despesas) ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS expenses (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    description    TEXT NOT NULL,
    amount         NUMERIC(10,2) NOT NULL,
    due_date       DATE NOT NULL,
    category       TEXT NOT NULL,
    status         TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago')),
    receipt_url    TEXT,
    class_id       UUID REFERENCES classes(id) ON DELETE SET NULL,
    created_by     UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── invoices_tracking ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoices_tracking (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id           UUID REFERENCES students(id) ON DELETE CASCADE,
    financial_record_id  UUID REFERENCES financial_records(id) ON DELETE SET NULL,
    nf_number            TEXT,
    amount               NUMERIC(10,2) NOT NULL,
    issue_date           DATE,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── onboarding_logs (pós-pagamento Asaas) ───────────────────────────
CREATE TABLE IF NOT EXISTS onboarding_logs (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id        UUID REFERENCES users(id) ON DELETE SET NULL,
    asaas_payment_id  TEXT,
    asaas_customer_id TEXT,
    course_id         UUID,
    payment_value     NUMERIC(10,2),
    payment_method    TEXT,
    email_sent        BOOLEAN DEFAULT FALSE,
    whatsapp_sent     BOOLEAN DEFAULT FALSE,
    credentials_login TEXT,
    error_message     TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
